
from pathlib import Path
from uuid import uuid4
import shutil
import subprocess
import threading

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

app = FastAPI(
    title="ToneMatch AI API",
    description="Servidor de análise e separação de guitarra",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"]
)

RAIZ = Path(__file__).resolve().parent.parent
PYTHON = RAIZ / ".venv" / "Scripts" / "python.exe"
PASTA_PROCESSAMENTO = RAIZ / "processamentos"

PASTA_PROCESSAMENTO.mkdir(exist_ok=True)

# Permite apenas um processamento de IA por vez.
ocupado = threading.Lock()

MAX_BYTES = 30 * 1024 * 1024
EXTENSOES = {".mp3", ".wav"}


@app.get("/")
def inicio():
    return {
        "sistema": "ToneMatch AI",
        "mensagem": "Servidor funcionando!",
        "status": "online"
    }


@app.get("/health")
def verificar_saude():
    return {
        "status": "ok",
        "servico": "ToneMatch AI Backend"
    }


@app.post("/separar-guitarra")
def separar_guitarra(arquivo: UploadFile = File(...)):
    if not ocupado.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="Outro áudio está sendo processado."
        )

    identificador = uuid4().hex
    pasta = PASTA_PROCESSAMENTO / identificador

    try:
        extensao = Path(arquivo.filename or "").suffix.lower()

        if extensao not in EXTENSOES:
            raise HTTPException(
                status_code=400,
                detail="Envie um arquivo MP3 ou WAV."
            )

        pasta.mkdir(parents=True, exist_ok=True)
        entrada = pasta / f"entrada{extensao}"

        with entrada.open("wb") as destino:
            total = 0

            while True:
                bloco = arquivo.file.read(1024 * 1024)
                if not bloco:
                    break

                total += len(bloco)

                if total > MAX_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="O limite é de 30 MB."
                    )

                destino.write(bloco)

        if total == 0:
            raise HTTPException(
                status_code=400,
                detail="O arquivo está vazio."
            )

        # Limite local de 30 segundos para este primeiro teste.
        duracao = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(entrada)
            ],
            capture_output=True,
            text=True,
            timeout=30
        )

        try:
            segundos = float(duracao.stdout.strip())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Não foi possível ler o áudio."
            )

        if not (0 < segundos <= 30):
            raise HTTPException(
                status_code=400,
                detail="Envie um trecho de até 30 segundos."
            )

        comando = [
            str(PYTHON),
            "-m", "demucs",
            "-n", "htdemucs_6s",
            "-d", "cpu",
            "--two-stems", "guitar",
            "--segment", "7",
            "-j", "1",
            "-o", str(pasta / "saida"),
            str(entrada)
        ]

        try:
            processo = subprocess.run(
                comando,
                capture_output=True,
                text=True,
                timeout=600
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(
                status_code=504,
                detail="O processamento ultrapassou o limite."
            )

        if processo.returncode != 0:
            print(processo.stderr[-4000:])
            raise HTTPException(
                status_code=500,
                detail="Falha ao executar a separação."
            )

        resultado = (
            pasta / "saida" / "htdemucs_6s" /
            entrada.stem / "guitar.wav"
        )

        if not resultado.is_file():
            raise HTTPException(
                status_code=500,
                detail="O modelo não gerou o arquivo da guitarra."
            )

        return {
            "status": "concluido",
            "mensagem": "Separação concluída.",
            "id": identificador,
            "guitarra_url": f"/resultado/{identificador}"
        }

    except HTTPException:
        shutil.rmtree(pasta, ignore_errors=True)
        raise

    except Exception:
        shutil.rmtree(pasta, ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao processar o áudio."
        )

    finally:
        arquivo.file.close()
        ocupado.release()


@app.get("/resultado/{identificador}")
def obter_resultado(identificador: str):
    if (
        len(identificador) != 32 or
        any(c not in "0123456789abcdef" for c in identificador)
    ):
        raise HTTPException(status_code=400, detail="ID inválido.")

    caminho = (
        PASTA_PROCESSAMENTO / identificador /
        "saida" / "htdemucs_6s" /
        "entrada" / "guitar.wav"
    )

    # A extensão da entrada pode ser MP3 ou WAV.
    if not caminho.exists():
        pasta = (
            PASTA_PROCESSAMENTO / identificador /
            "saida" / "htdemucs_6s"
        )

        encontrados = list(pasta.glob("*/guitar.wav"))

        if not encontrados:
            raise HTTPException(
                status_code=404,
                detail="Áudio não encontrado."
            )

        caminho = encontrados[0]

    return FileResponse(
        caminho,
        media_type="audio/wav",
        filename="guitar.wav"
    )
