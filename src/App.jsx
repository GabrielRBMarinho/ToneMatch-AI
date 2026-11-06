
import { useEffect, useRef, useState } from 'react'
import './App.css'

import SeparadorGuitarra from './SeparadorGuitarra'


const configuracoes = {
  Clean: {
    descricao: 'Som limpo, com boa definição e dinâmica.',
    efeitos: ['Compressor', 'Amplificador Clean', 'Cab/IR', 'Delay suave', 'Reverb'],
    parametros: { Gain: 30, Bass: 50, Middle: 55, Treble: 60, Delay: 30, Reverb: 25 }
  },
  Drive: {
    descricao: 'Som com saturação para bases e riffs.',
    efeitos: ['Overdrive', 'Amplificador Crunch', 'Cab/IR', 'Equalizador', 'Reverb leve'],
    parametros: { Gain: 65, Bass: 55, Middle: 60, Treble: 55, Delay: 20, Reverb: 15 }
  },
  Solo: {
    descricao: 'Som com destaque, sustain e ambiência.',
    efeitos: ['Compressor', 'Overdrive', 'Amplificador Lead', 'Cab/IR', 'Delay', 'Reverb'],
    parametros: { Gain: 75, Bass: 55, Middle: 65, Treble: 60, Delay: 45, Reverb: 35 }
  }
}

const modos = [
  {
    id: 'completo',
    titulo: '🎵 Áudio completo',
    descricao: 'Analisa todos os sons presentes na gravação.'
  },
  {
    id: 'guitarra',
    titulo: '🎸 Guitarra isolada',
    descricao: 'Analisa um arquivo que já contenha somente guitarra.'
  },
  {
    id: 'separar',
    titulo: '🤖 Separar guitarra da música',
    descricao: 'Separação automática por IA — em desenvolvimento.'
  }
]

function tempo(segundos) {
  if (!Number.isFinite(segundos)) return 'Não disponível'
  const s = Math.floor(segundos)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function converterTempo(texto) {
  const partes = /^(\d+):([0-5]?\d)$/.exec(texto.trim())
  return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null
}

function db(valor) {
  return 20 * Math.log10(Math.max(valor, 1e-10))
}

function fft(amostras) {
  const n = amostras.length
  const real = Float64Array.from(amostras)
  const imag = new Float64Array(n)
  let j = 0

  for (let i = 1; i < n; i++) {
    let bit = n >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit

    if (i < j) {
      const t = real[i]
      real[i] = real[j]
      real[j] = t
    }
  }

  for (let tamanho = 2; tamanho <= n; tamanho *= 2) {
    const angulo = -2 * Math.PI / tamanho
    const wr = Math.cos(angulo)
    const wi = Math.sin(angulo)

    for (let i = 0; i < n; i += tamanho) {
      let ur = 1
      let ui = 0

      for (let k = 0; k < tamanho / 2; k++) {
        const a = i + k
        const b = a + tamanho / 2
        const tr = ur * real[b] - ui * imag[b]
        const ti = ur * imag[b] + ui * real[b]

        real[b] = real[a] - tr
        imag[b] = imag[a] - ti
        real[a] += tr
        imag[a] += ti

        const proximoUr = ur * wr - ui * wi
        ui = ur * wi + ui * wr
        ur = proximoUr
      }
    }
  }

  return { real, imag }
}

function analisarSinal(buffer, inicioSeg, fimSeg) {
  const taxa = buffer.sampleRate
  const inicio = Math.max(0, Math.floor(inicioSeg * taxa))
  const fim = Math.min(buffer.length, Math.ceil(fimSeg * taxa))

  if (fim <= inicio) throw new Error('Intervalo inválido')

  const canais = Array.from(
    { length: buffer.numberOfChannels },
    (_, i) => buffer.getChannelData(i)
  )

  let soma = 0
  let pico = 0
  let quantidade = 0

  for (let i = inicio; i < fim; i += 16) {
    for (const canal of canais) {
      const valor = canal[i]
      soma += valor * valor
      pico = Math.max(pico, Math.abs(valor))
      quantidade++
    }
  }

  const rms = Math.sqrt(soma / Math.max(1, quantidade))
  const n = 2048
  const niveis = []
  let energiaTotal = 0
  let energiaAguda = 0
  let somaCentroide = 0
  let validas = 0

  for (let janela = 0; janela < 16; janela++) {
    const deslocamento = Math.floor(
      (janela + 0.5) * Math.max(0, fim - inicio - n) / 16
    )
    const base = inicio + deslocamento
    const amostras = new Float64Array(n)
    let energia = 0

    for (let i = 0; i < n; i++) {
      let valor = 0
      if (base + i < fim) {
        for (const canal of canais) {
          valor += canal[base + i] / canais.length
        }
      }
      energia += valor * valor
      amostras[i] = valor * (
        0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1))
      )
    }

    const nivel = Math.sqrt(energia / n)
    niveis.push(db(nivel))
    if (nivel < 0.00001) continue

    const { real, imag } = fft(amostras)
    let potenciaTotal = 0
    let frequencias = 0

    for (let i = 1; i < n / 2; i++) {
      const hz = i * taxa / n
      const potencia = real[i] ** 2 + imag[i] ** 2
      potenciaTotal += potencia
      frequencias += hz * potencia
      energiaTotal += potencia
      if (hz >= 2500) energiaAguda += potencia
    }

    if (potenciaTotal > 0) {
      somaCentroide += frequencias / potenciaTotal
      validas++
    }
  }

  niveis.sort((a, b) => a - b)

  return {
    rmsDb: db(rms),
    picoDb: db(pico),
    brilho: energiaTotal > 0 ? 100 * energiaAguda / energiaTotal : 0,
    centroide: validas ? somaCentroide / validas : 0,
    variacaoDb: Math.max(0, niveis[14] - niveis[1]),
    taxa,
    inicioSeg,
    fimSeg
  }
}

function App() {
  const [modo, setModo] = useState('completo')
  const [link, setLink] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [timbre, setTimbre] = useState('')
  const [ajustes, setAjustes] = useState({})
  const [arquivo, setArquivo] = useState(null)
  const [urlAudio, setUrlAudio] = useState('')
  const [duracao, setDuracao] = useState(null)
  const [erroAudio, setErroAudio] = useState('')
  const [arrastando, setArrastando] = useState(false)
  const [inicio, setInicio] = useState(0)
  const [fim, setFim] = useState(0)
  const [textoInicio, setTextoInicio] = useState('0:00')
  const [textoFim, setTextoFim] = useState('0:00')
  const [erroTempo, setErroTempo] = useState('')
  const [ouvindoTrecho, setOuvindoTrecho] = useState(false)
  const [analisando, setAnalisando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const inputArquivo = useRef(null)
  const player = useRef(null)
  const contadorArrasto = useRef(0)
  const versaoArquivo = useRef(0)
  const versaoAnalise = useRef(0)

  useEffect(() => {
    if (!arquivo) {
      setUrlAudio('')
      return
    }
    const url = URL.createObjectURL(arquivo)
    setUrlAudio(url)
    return () => URL.revokeObjectURL(url)
  }, [arquivo])

  function pararTrecho() {
    setOuvindoTrecho(false)
    if (player.current) player.current.pause()
  }

  function selecionarModo(novoModo) {
    if (novoModo === 'separar') return
    pararTrecho()
    versaoAnalise.current++
    setModo(novoModo)
    setResultado(null)
    setAnalisando(false)
  }

  function validarArquivo(novo) {
    versaoArquivo.current++
    versaoAnalise.current++
    pararTrecho()
    setArquivo(null)
    setDuracao(null)
    setInicio(0)
    setFim(0)
    setTextoInicio('0:00')
    setTextoFim('0:00')
    setErroAudio('')
    setErroTempo('')
    setResultado(null)
    setAnalisando(false)

    if (!novo) return

    const ext = novo.name.split('.').pop()?.toLowerCase()
    if (!['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      setErroAudio('Utilize MP3, WAV, OGG ou M4A.')
      return
    }
    if (novo.size > 100 * 1024 * 1024) {
      setErroAudio('O limite inicial é de 100 MB.')
      return
    }
    setArquivo(novo)
  }

  function aplicarIntervalo(a, b) {
    pararTrecho()
    versaoAnalise.current++
    setInicio(a)
    setFim(b)
    setTextoInicio(tempo(a))
    setTextoFim(tempo(b))
    setErroTempo('')
    setResultado(null)
    setAnalisando(false)
  }

  function confirmarHorarios() {
    const a = converterTempo(textoInicio)
    const b = converterTempo(textoFim)

    if (
      a === null || b === null ||
      duracao === null || a >= b || b > duracao
    ) {
      setErroTempo('Informe horários válidos, por exemplo 3:39 e 3:52.')
      return
    }
    aplicarIntervalo(a, b)
  }

  function abrirVideo() {
    try {
      const url = new URL(link.trim())
      const host = url.hostname.toLowerCase()
      let id = ''

      if (['youtu.be', 'www.youtu.be'].includes(host)) {
        id = url.pathname.split('/')[1]
      } else if (
        ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)
      ) {
        if (url.pathname === '/watch') id = url.searchParams.get('v')
        else if (/^\/(shorts|live)\//.test(url.pathname)) {
          id = url.pathname.split('/')[2]
        }
      }

      if (
        !['http:', 'https:'].includes(url.protocol) ||
        !/^[A-Za-z0-9_-]{11}$/.test(id || '')
      ) {
        setMensagem('Insira um link válido do YouTube.')
        return
      }

      window.open(
        `https://www.youtube.com/watch?v=${id}`,
        '_blank',
        'noopener,noreferrer'
      )
      setMensagem('Tentativa de abrir o vídeo realizada.')
    } catch {
      setMensagem('Insira um link válido do YouTube.')
    }
  }

  async function ouvirTrecho() {
    if (!player.current || erroTempo || fim <= inicio) return
    try {
      pararTrecho()
      player.current.currentTime = inicio
      setOuvindoTrecho(true)
      await player.current.play()
    } catch {
      setOuvindoTrecho(false)
      setErroAudio('Não foi possível reproduzir o trecho.')
    }
  }

  async function analisarAudio() {
    if (!arquivo || analisando || erroTempo || fim <= inicio) return

    const versao = versaoAnalise.current
    const arquivoVersao = versaoArquivo.current
    setAnalisando(true)
    setErroAudio('')
    setResultado(null)

    await new Promise(resolve => requestAnimationFrame(resolve))
    let contexto

    try {
      contexto = new AudioContext()
      const dados = await arquivo.arrayBuffer()
      const buffer = await contexto.decodeAudioData(dados)

      if (
        versao !== versaoAnalise.current ||
        arquivoVersao !== versaoArquivo.current
      ) return

      const medidas = analisarSinal(buffer, inicio, fim)

      if (
        versao === versaoAnalise.current &&
        arquivoVersao === versaoArquivo.current
      ) setResultado(medidas)
    } catch {
      if (versao === versaoAnalise.current) {
        setErroAudio('Não foi possível analisar este arquivo.')
      }
    } finally {
      if (contexto) await contexto.close().catch(() => {})
      if (versao === versaoAnalise.current) setAnalisando(false)
    }
  }

  const atual = configuracoes[timbre]

  const caixa = {
    background: '#171d30',
    border: '1px solid #35405e',
    borderRadius: 14,
    padding: 24,
    marginTop: 24
  }

  const campo = {
    background: '#101729',
    border: '1px solid #53638b',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    minWidth: 0,
    color: 'white',
    fontSize: 16
  }

  return (
    <main className="tonematch">
      <div className="conteudo">
        <p className="etiqueta">GUITAR TONE INTELLIGENCE</p>
        <h1>🎸 ToneMatch AI</h1>
        <p className="descricao">
          Seu laboratório inteligente de timbres de guitarra.
        </p>

        <div className="painel">
          <h2>Encontre seu timbre</h2>
          <p>Abra um vídeo de referência do YouTube.</p>

          <div className="campo-video">
            <input
              type="url"
              aria-label="Link do YouTube"
              placeholder="Cole aqui o link do YouTube..."
              value={link}
              onChange={e => {
                setLink(e.target.value)
                setMensagem('')
              }}
            />
            <button type="button" onClick={abrirVideo}>
              Abrir vídeo
            </button>
          </div>
          <p className="mensagem-video" role="status">{mensagem}</p>

          <section className="painel-audio">
            <h3>🎧 Analisar Timbre</h3>

            <div style={caixa}>
              <h3 style={{ marginTop: 0 }}>Modo de análise</h3>
              <p>Escolha como deseja analisar a gravação.</p>

              {modos.map(item => (
                <label
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    textAlign: 'left',
                    padding: '14px 0',
                    opacity: item.id === 'separar' ? 0.5 : 1,
                    cursor: item.id === 'separar' ? 'not-allowed' : 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="modo-analise"
                    checked={modo === item.id}
                    disabled={item.id === 'separar'}
                    onChange={() => selecionarModo(item.id)}
                    style={{ marginTop: 5, accentColor: '#7c3aed' }}
                  />
                  <span>
                    <strong>{item.titulo}</strong>
                    <span style={{
                      display: 'block',
                      color: '#aab6cc',
                      fontSize: 13,
                      marginTop: 5
                    }}>
                      {item.descricao}
                    </span>
                  </span>
                </label>
              ))}

              <p style={{ color: '#38bdf8' }}>
                Modo selecionado: {
                  modo === 'guitarra' ? 'Guitarra isolada' : 'Áudio completo'
                }
              </p>
            </div>

            <p style={{ marginTop: 24 }}>
              {modo === 'guitarra'
                ? 'Carregue uma gravação contendo apenas guitarra.'
                : 'Carregue uma gravação para analisar a mistura completa.'}
            </p>

            <div
              className={`zona-upload ${arrastando ? 'arrastando' : ''}`}
              onDragEnter={e => {
                e.preventDefault()
                contadorArrasto.current++
                setArrastando(true)
              }}
              onDragLeave={e => {
                e.preventDefault()
                contadorArrasto.current = Math.max(
                  0, contadorArrasto.current - 1
                )
                if (!contadorArrasto.current) setArrastando(false)
              }}
              onDragOver={e => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
              }}
              onDrop={e => {
                e.preventDefault()
                contadorArrasto.current = 0
                setArrastando(false)
                if (e.dataTransfer.files.length !== 1) {
                  setErroAudio('Solte apenas um arquivo por vez.')
                  return
                }
                validarArquivo(e.dataTransfer.files[0])
              }}
            >
              <div className="icone-upload">🎵</div>
              <p className="titulo-upload">
                Arraste e solte seu áudio aqui
              </p>
              <p>ou clique no botão abaixo</p>
              <button
                type="button"
                className="botao-upload"
                onClick={() => inputArquivo.current?.click()}
              >
                Selecionar arquivo de áudio
              </button>
              <input
                ref={inputArquivo}
                type="file"
                accept=".mp3,.wav,.ogg,.m4a"
                className="input-oculto"
                onChange={e => {
                  validarArquivo(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <p>MP3, WAV, OGG ou M4A — até 100 MB</p>
            </div>

            {erroAudio && (
              <p className="erro-audio" role="alert">{erroAudio}</p>
            )}

            {arquivo && (
              <div className="detalhes-audio">
                <h4>✅ Arquivo carregado</h4>
                <p><strong>Nome:</strong> {arquivo.name}</p>
                <p>
                  <strong>Tamanho:</strong>{' '}
                  {(arquivo.size / 1048576).toFixed(2)} MB
                </p>
                <p>
                  <strong>Duração:</strong>{' '}
                  {duracao === null ? 'Carregando...' : tempo(duracao)}
                </p>

                {urlAudio && (
                  <audio
                    ref={player}
                    key={urlAudio}
                    controls
                    preload="metadata"
                    src={urlAudio}
                    onLoadedMetadata={e => {
                      const d = e.currentTarget.duration
                      if (!Number.isFinite(d) || d <= 0) {
                        setErroAudio('Duração indisponível.')
                        return
                      }
                      setDuracao(d)
                      aplicarIntervalo(0, Math.min(20, d))
                    }}
                    onTimeUpdate={e => {
                      if (
                        ouvindoTrecho &&
                        e.currentTarget.currentTime >= fim
                      ) pararTrecho()
                    }}
                    onEnded={() => setOuvindoTrecho(false)}
                    onError={() =>
                      setErroAudio('Não foi possível reproduzir o áudio.')
                    }
                    style={{ width: '100%', marginTop: 15 }}
                  />
                )}

                {duracao !== null && duracao >= 1 && (
                  <div style={caixa}>
                    <h3>✂️ Selecionar trecho musical</h3>
                    <p>Arraste as barras ou digite os horários.</p>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 12,
                      marginTop: 20
                    }}>
                      <label>
                        Início (min:seg)
                        <input
                          style={campo}
                          value={textoInicio}
                          onChange={e => {
                            setTextoInicio(e.target.value)
                            setErroTempo('Clique em Aplicar horários.')
                            setResultado(null)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') confirmarHorarios()
                          }}
                        />
                      </label>
                      <label>
                        Fim (min:seg)
                        <input
                          style={campo}
                          value={textoFim}
                          onChange={e => {
                            setTextoFim(e.target.value)
                            setErroTempo('Clique em Aplicar horários.')
                            setResultado(null)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') confirmarHorarios()
                          }}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="botao-upload"
                      onClick={confirmarHorarios}
                    >
                      ✓ Aplicar horários
                    </button>

                    {erroTempo && (
                      <p style={{ color: '#fbbf24' }}>{erroTempo}</p>
                    )}

                    <div style={{ textAlign: 'left' }}>
                      <label htmlFor="inicio-trecho">
                        Início: {tempo(inicio)}
                      </label>
                      <input
                        id="inicio-trecho"
                        type="range"
                        min="0"
                        max={Math.max(0, Math.floor(duracao) - 1)}
                        value={inicio}
                        onChange={e => {
                          const a = Number(e.target.value)
                          aplicarIntervalo(a, Math.max(fim, a + 1))
                        }}
                        style={{
                          width: '100%',
                          accentColor: '#7c3aed',
                          margin: '14px 0 24px'
                        }}
                      />
                      <label htmlFor="fim-trecho">
                        Fim: {tempo(fim)}
                      </label>
                      <input
                        id="fim-trecho"
                        type="range"
                        min="1"
                        max={Math.floor(duracao)}
                        value={fim}
                        onChange={e => {
                          const b = Number(e.target.value)
                          aplicarIntervalo(Math.min(inicio, b - 1), b)
                        }}
                        style={{
                          width: '100%',
                          accentColor: '#7c3aed',
                          margin: '14px 0 24px'
                        }}
                      />
                    </div>

                    <p>
                      <strong>{tempo(inicio)} — {tempo(fim)}</strong>
                      {' · '}{Math.round(fim - inicio)} segundos
                    </p>
                    <button
                      className="botao-upload"
                      type="button"
                      disabled={Boolean(erroTempo) || fim <= inicio}
                      onClick={ouvirTrecho}
                    >
                      ▶ Ouvir trecho
                    </button>
                  </div>
                )}

                <button
                  className="botao-analisar"
                  type="button"
                  disabled={
                    analisando || Boolean(erroTempo) ||
                    duracao === null || fim <= inicio
                  }
                  onClick={analisarAudio}
                >
                  {analisando ? 'Analisando trecho...' : '🔍 Analisar trecho'}
                </button>
              </div>
            )}

            {resultado && (
              <div className="resultado-analise">
                <h3>📊 Resultado da Análise</h3>
                <p className="aviso-resultado">
                  Modo: {modo === 'guitarra'
                    ? 'Guitarra isolada (informado pelo usuário)'
                    : 'Áudio completo'}
                </p>
                <p>
                  Trecho: {tempo(resultado.inicioSeg)} até{' '}
                  {tempo(resultado.fimSeg)}
                </p>

                <div className="grade-resultados">
                  {[
                    ['Volume RMS', `${resultado.rmsDb.toFixed(1)} dBFS`],
                    ['Pico amostrado', `${resultado.picoDb.toFixed(1)} dBFS`],
                    ['Energia acima de 2,5 kHz', `${resultado.brilho.toFixed(1)}%`],
                    ['Centroide espectral', `${resultado.centroide.toFixed(0)} Hz`],
                    ['Variação de nível', `${resultado.variacaoDb.toFixed(1)} dB`],
                    ['Taxa de amostragem', `${resultado.taxa.toLocaleString('pt-BR')} Hz`]
                  ].map(([nome, valor]) => (
                    <div className="metrica" key={nome}>
                      <span>{nome}</span>
                      <strong>{valor}</strong>
                    </div>
                  ))}
                </div>

                <p className="aviso-editor">
                  Métricas aproximadas obtidas por amostragem.
                  Ainda não identificamos efeitos ou amplificadores.
                </p>
              </div>
            )}
          </section>

{arquivo && (
  <SeparadorGuitarra
    key={`${arquivo.name}-${arquivo.size}-${arquivo.lastModified}-${inicio}-${fim}`}
    arquivo={arquivo}
    inicio={inicio}
    fim={fim}
  />
)}

          <h3>Tipos de timbre</h3>
          <div className="recursos">
            {Object.keys(configuracoes).map(tipo => (
              <button
                type="button"
                key={tipo}
                className={timbre === tipo ? 'ativo' : ''}
                aria-pressed={timbre === tipo}
                onClick={() => {
                  setTimbre(tipo)
                  setAjustes({ ...configuracoes[tipo].parametros })
                }}
              >
                {tipo}
              </button>
            ))}
          </div>

          {atual && (
            <>
              <p className="timbre-selecionado">
                <strong>{timbre} selecionado!</strong>{' '}
                {atual.descricao}
              </p>

              <div className="painel-efeitos">
                <h3>Cadeia de efeitos — {timbre}</h3>
                <p>Sugestão inicial para Sonicake Matribox II</p>
                <div className="lista-efeitos">
                  {atual.efeitos.map((efeito, i) => (
                    <div className="efeito" key={`${timbre}-${i}`}>
                      <span>{i + 1}</span>
                      <strong>{efeito}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="editor-timbre">
                <h3>🎛️ Editor de Timbres</h3>
                <p>Ajuste os parâmetros do seu timbre.</p>
                <div className="controles">
                  {Object.entries(ajustes).map(([nome, valor]) => (
                    <div className="controle" key={nome}>
                      <div className="controle-cabecalho">
                        <label htmlFor={`param-${nome}`}>{nome}</label>
                        <span>{valor}%</span>
                      </div>
                      <input
                        id={`param-${nome}`}
                        type="range"
                        min="0"
                        max="100"
                        value={valor}
                        onChange={e =>
                          setAjustes(anterior => ({
                            ...anterior,
                            [nome]: Number(e.target.value)
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <p className="aviso-editor">
                  Valores ilustrativos. Não alteram a pedaleira.
                </p>
              </div>

              <div className="exportacao">
                <h3>📁 Exportação de Preset</h3>
                <p>Exportar configurações para a Matribox II.</p>
                <button type="button" disabled>
                  Exportar .PRST — Em breve
                </button>
              </div>
            </>
          )}

          <p className="status">
            ToneMatch AI — Versão 1.0 em desenvolvimento
          </p>
        </div>
      </div>
    </main>
  )
}

export default App
