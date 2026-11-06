
import { useEffect, useState } from 'react'

const API = 'http://127.0.0.1:8000'

const MODULOS = [
  'NR', 'FX 1', 'FX 2', 'AMP', 'CAB',
  'EQ', 'MOD', 'DLY', 'RVB', 'VOL'
]

const CORES = {
  NR: '#829ba7',
  'FX 1': '#8495ab',
  'FX 2': '#f04448',
  AMP: '#f18425',
  CAB: '#e6d21e',
  EQ: '#12c955',
  MOD: '#788ca8',
  DLY: '#9239f4',
  RVB: '#19cfbd',
  VOL: '#ba30bd'
}

// Modelos identificados no software da Matribox II.
// Alguns parâmetros continuam provisórios.

const MODELOS = {
  NR: ['Gate 1', 'Gate 2'],

  'FX 1': [
    'COMP 1', 'COMP 2', 'COMP 3',
    'M-Boost', 'Skreamer', 'Blues OD'
  ],

  'FX 2': [
    'Skreamer', 'M-Boost', 'Blues OD',
    'COMP 1'
  ],

  AMP: [
    'Calif IIC+ 1',
    'Calif IIC+ 2',
    'Calif IIC++ 3',
    'Calif IV LD 1',
    'Calif Dual V',
    'Dark Double',
    'Dark Deluxe',
    'Jazz 120',
    'Voks 30N',
    'Voks 30TB',
    'B-Man Bri'
  ],

  CAB: [
    'Brit MD 4x12',
    'Brit GN 4x12',
    'Brit 75 4x12',
    'Brit BK 4x12',
    'Voks 1x12',
    'Voks 2x12',
    'Bog SV 2x12',
    'Chief 2x12',
    'Calif 4x12'
  ],

  EQ: [
    'Guitar EQ 1',
    'Guitar EQ 2',
    'Bass EQ 1',
    'Bass EQ 2',
    'Calif EQ'
  ],

  MOD: ['Chorus-E', 'D-Chorus', 'Flanger'],

  DLY: [
    'Warm', 'Pure', 'Mag', 'Tube',
    'BBD', 'Ping Pong', 'Slapback', 'Sweep'
  ],

  RVB: [
    'Studio', 'Room', 'Hall',
    'Church', 'Plate', 'Spring',
    'Sky', 'Sea'
  ],

  VOL: ['Volume']
}

// Cada controle possui nome, valor inicial,
// unidade e faixa de edição.
//
// Os limites que ainda não foram conferidos
// no software oficial são provisórios.

function controle(nome, valor, min, max, unidade = '', step = 1) {
  return {
    nome,
    valor,
    min,
    max,
    unidade,
    step
  }
}

function obterControles(modulo, modelo) {
  if (modulo === 'AMP') {
    return [
      controle('Gain', 50, 0, 100),
      controle('Presence', 50, 0, 100),
      controle('Volume', 50, 0, 100),
      controle('Bass', 50, 0, 100),
      controle('Middle', 50, 0, 100),
      controle('Treble', 50, 0, 100)
    ]
  }

  if (modulo === 'CAB') {
    return [
      controle('Volume', 50, 0, 100),
      controle('Low Cut', 100, 20, 1000, 'Hz', 10),
      controle('High Cut', 6000, 1000, 20000, 'Hz', 100)
    ]
  }

  if (modulo === 'EQ' && modelo === 'Guitar EQ 2') {
    return [
      controle('100Hz', 0, -15, 15),
      controle('500Hz', -12, -15, 15),
      controle('1kHz', -5, -15, 15),
      controle('3kHz', 0, -15, 15),
      controle('6kHz', -10, -15, 15),
      controle('Volume', 50, 0, 100)
    ]
  }

  if (modulo === 'EQ') {
    return [
      controle('Volume', 50, 0, 100)
    ]
  }

  if (modulo === 'DLY') {
    return [
      controle('Mix', 22, 0, 100),
      controle('Time', 500, 1, 2000, 'ms'),
      controle('Feedback', 23, 0, 100)
    ]
  }

  if (modulo === 'RVB' && modelo === 'Hall') {
    return [
      controle('Mix', 26, 0, 100),
      controle('Pre Delay', 50, 0, 200, 'ms'),
      controle('Decay', 33, 0, 100)
    ]
  }

  if (modulo === 'RVB') {
    return [
      controle('Mix', 20, 0, 100),
      controle('Pre Delay', 30, 0, 200, 'ms'),
      controle('Decay', 35, 0, 100)
    ]
  }

  if (modulo === 'VOL') {
    return [
      controle('Volume', 65, 0, 100)
    ]
  }

  if (modulo === 'NR') {
    return [
      controle('Threshold', 25, 0, 100)
    ]
  }

  if (modulo === 'MOD') {
    return [
      controle('Mix', 20, 0, 100),
      controle('Rate', 30, 0, 100),
      controle('Depth', 30, 0, 100)
    ]
  }

  return [
    controle('Gain', 25, 0, 100),
    controle('Tone', 50, 0, 100),
    controle('Level', 50, 0, 100)
  ]
}

// Estrutura inicial de cada tipo de timbre.
// São pontos de partida, não presets oficiais.

const CONFIGURACOES = {
  Clean: {
    NR: ['Gate 1', false],
    'FX 1': ['COMP 1', true],
    'FX 2': ['Skreamer', false],
    AMP: ['Dark Double', true],
    CAB: ['Voks 2x12', true],
    EQ: ['Guitar EQ 2', false],
    MOD: ['Chorus-E', false],
    DLY: ['Warm', true],
    RVB: ['Hall', true],
    VOL: ['Volume', true]
  },

  Drive: {
    NR: ['Gate 1', true],
    'FX 1': ['COMP 1', false],
    'FX 2': ['Skreamer', true],
    AMP: ['B-Man Bri', true],
    CAB: ['Brit MD 4x12', true],
    EQ: ['Guitar EQ 2', false],
    MOD: ['Chorus-E', false],
    DLY: ['Warm', false],
    RVB: ['Hall', true],
    VOL: ['Volume', true]
  },

  Solo: {
    NR: ['Gate 1', true],
    'FX 1': ['COMP 1', false],
    'FX 2': ['Skreamer', true],
    AMP: ['Calif IIC+ 1', true],
    CAB: ['Calif 4x12', true],
    EQ: ['Guitar EQ 2', true],
    MOD: ['Chorus-E', false],
    DLY: ['Warm', true],
    RVB: ['Hall', true],
    VOL: ['Volume', true]
  }
}

function criarPresets() {
  const resultado = {}

  for (const [tipo, modulos] of Object.entries(CONFIGURACOES)) {
    resultado[tipo] = {}

    for (const [nome, [modelo, ligado]] of Object.entries(modulos)) {
      const controles = obterControles(nome, modelo)

      const valores = {}

      controles.forEach(c => {
        valores[c.nome] = c.valor
      })

      if (nome === 'AMP') {
        valores.Gain =
          tipo === 'Clean' ? 26 :
          tipo === 'Drive' ? 52 : 60
      }

      if (nome === 'DLY') {
        valores.Mix =
          tipo === 'Clean' ? 20 :
          tipo === 'Drive' ? 12 : 27
      }

      resultado[tipo][nome] = {
        modelo,
        ligado,
        valores,
        sync: nome === 'DLY',
        timeDiv: '1/4',
        trail: nome === 'DLY' || nome === 'RVB'
      }
    }
  }

  return resultado
}

// Converte o trecho original em WAV.

function criarWav(buffer, inicio, fim) {
  const taxa = buffer.sampleRate
  const primeiro = Math.floor(inicio * taxa)
  const ultimo = Math.min(
    buffer.length,
    Math.floor(fim * taxa)
  )

  const quantidade = ultimo - primeiro

  if (quantidade <= 0) {
    throw new Error('Trecho inválido.')
  }

  const canais = Math.min(buffer.numberOfChannels, 2)

  const dados = new ArrayBuffer(
    44 + quantidade * canais * 2
  )

  const view = new DataView(dados)

  function escrever(pos, texto) {
    for (let i = 0; i < texto.length; i++) {
      view.setUint8(pos + i, texto.charCodeAt(i))
    }
  }

  escrever(0, 'RIFF')
  view.setUint32(4, dados.byteLength - 8, true)
  escrever(8, 'WAVE')
  escrever(12, 'fmt ')

  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, canais, true)
  view.setUint32(24, taxa, true)
  view.setUint32(28, taxa * canais * 2, true)
  view.setUint16(32, canais * 2, true)
  view.setUint16(34, 16, true)

  escrever(36, 'data')
  view.setUint32(40, quantidade * canais * 2, true)

  let pos = 44

  for (let i = primeiro; i < ultimo; i++) {
    for (let c = 0; c < canais; c++) {
      const valor = Math.max(
        -1,
        Math.min(1, buffer.getChannelData(c)[i])
      )

      view.setInt16(
        pos,
        valor < 0
          ? Math.round(valor * 32768)
          : Math.round(valor * 32767),
        true
      )

      pos += 2
    }
  }

  return new Blob([dados], { type: 'audio/wav' })
}

// Análise espectral simplificada.
// Os valores descrevem a guitarra extraída.

function analisarAudio(buffer) {
  const n = 2048
  const bandas = [0, 0, 0]
  const canal = buffer.getChannelData(0)
  const taxa = buffer.sampleRate

  for (let janela = 0; janela < 12; janela++) {
    const base = Math.floor(
      (janela + 0.5) *
      Math.max(0, canal.length - n) / 12
    )

    const amostras = new Float64Array(n)

    for (let i = 0; i < n; i++) {
      const hann =
        0.5 - 0.5 * Math.cos(
          2 * Math.PI * i / (n - 1)
        )

      amostras[i] = (canal[base + i] || 0) * hann
    }

    let indice = 0

    for (let i = 1; i < n; i++) {
      let bit = n >> 1

      while (indice & bit) {
        indice ^= bit
        bit >>= 1
      }

      indice ^= bit

      if (i < indice) {
        const temp = amostras[i]
        amostras[i] = amostras[indice]
        amostras[indice] = temp
      }
    }

    const real = amostras
    const imag = new Float64Array(n)

    for (let tamanho = 2; tamanho <= n; tamanho *= 2) {
      for (let baseFFT = 0; baseFFT < n; baseFFT += tamanho) {
        for (let k = 0; k < tamanho / 2; k++) {
          const ang = -2 * Math.PI * k / tamanho
          const wr = Math.cos(ang)
          const wi = Math.sin(ang)

          const a = baseFFT + k
          const b = a + tamanho / 2

          const tr = wr * real[b] - wi * imag[b]
          const ti = wr * imag[b] + wi * real[b]

          real[b] = real[a] - tr
          imag[b] = imag[a] - ti

          real[a] += tr
          imag[a] += ti
        }
      }
    }

    for (let i = 1; i < n / 2; i++) {
      const hz = i * taxa / n
      const energia = real[i] ** 2 + imag[i] ** 2

      if (hz >= 80 && hz < 250) {
        bandas[0] += energia
      } else if (hz >= 250 && hz < 2000) {
        bandas[1] += energia
      } else if (hz >= 2000 && hz <= 8000) {
        bandas[2] += energia
      }
    }
  }

  const total = bandas.reduce((a, b) => a + b, 0)

  if (total <= 0) {
    throw new Error('Áudio sem sinal suficiente.')
  }

  return {
    graves: 100 * bandas[0] / total,
    medios: 100 * bandas[1] / total,
    agudos: 100 * bandas[2] / total
  }
}

const limitar = (valor, min = 0, max = 100) =>
  Math.round(Math.max(min, Math.min(max, valor)))

// Ajuste experimental da equalização.
// Não identifica automaticamente o equipamento.

function ajustarPresets(medidas) {
  const resultado = criarPresets()

  for (const tipo of ['Clean', 'Drive', 'Solo']) {
    const amp = resultado[tipo].AMP.valores

    amp.Bass = limitar(
      50 + (12 - medidas.graves) * 0.3,
      25, 75
    )

    amp.Middle = limitar(
      50 + (50 - medidas.medios) * 0.15,
      25, 75
    )

    amp.Treble = limitar(
      50 + (20 - medidas.agudos) * 0.35,
      25, 75
    )
  }

  return resultado
}

export default function SeparadorGuitarra({
  arquivo,
  inicio,
  fim
}) {
  const [tipo, setTipo] = useState('Clean')
  const [modulo, setModulo] = useState('AMP')

  const [presets, setPresets] = useState(criarPresets)
  const [medidas, setMedidas] = useState(null)

  const [urlAudio, setUrlAudio] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [processando, setProcessando] = useState(false)

  const atual = presets[tipo][modulo]

  useEffect(() => {
    setMedidas(null)
    setUrlAudio('')
    setMensagem('')
  }, [arquivo, inicio, fim])

  function atualizar(changes) {
    setPresets(anterior => ({
      ...anterior,
      [tipo]: {
        ...anterior[tipo],
        [modulo]: {
          ...anterior[tipo][modulo],
          ...changes
        }
      }
    }))
  }

  function alterarParametro(nome, valor) {
    atualizar({
      valores: {
        ...atual.valores,
        [nome]: Number(valor)
      }
    })
  }

  function selecionarModelo(modelo) {
    const controles = obterControles(modulo, modelo)
    const valores = {}

    controles.forEach(c => {
      valores[c.nome] =
        atual.valores[c.nome] ?? c.valor
    })

    atualizar({
      modelo,
      valores
    })
  }

  async function gerarTimbres() {
    if (!arquivo) {
      setMensagem('Carregue uma música primeiro.')
      return
    }

    if (
      !Number.isFinite(inicio) ||
      !Number.isFinite(fim) ||
      inicio < 0 ||
      fim <= inicio ||
      fim - inicio > 30
    ) {
      setMensagem('Selecione um trecho de até 30 segundos.')
      return
    }

    setProcessando(true)
    setMensagem('Preparando áudio...')
    setMedidas(null)
    setUrlAudio('')

    let contexto

    try {
      contexto = new AudioContext()

      const original = await contexto.decodeAudioData(
        await arquivo.arrayBuffer()
      )

      if (fim > original.duration) {
        throw new Error(
          'O horário final ultrapassa a duração da música.'
        )
      }

      const wav = criarWav(original, inicio, fim)
      const form = new FormData()

      form.append('arquivo', wav, 'trecho.wav')

      setMensagem('Separando a guitarra com IA...')

      const resposta = await fetch(
        `${API}/separar-guitarra`,
        {
          method: 'POST',
          body: form
        }
      )

      const json = await resposta.json()

      if (!resposta.ok) {
        throw new Error(json.detail || 'Falha na separação.')
      }

      if (!/^[0-9a-f]{32}$/.test(json.id || '')) {
        throw new Error('Identificador inválido da API.')
      }

      const endereco = `${API}/resultado/${json.id}`

      setMensagem('Analisando guitarra extraída...')

      const respostaAudio = await fetch(endereco)

      if (!respostaAudio.ok) {
        throw new Error('Não foi possível obter a guitarra.')
      }

      const buffer = await contexto.decodeAudioData(
        await respostaAudio.arrayBuffer()
      )

      

      
console.log('ToneMatch: iniciando análise espectral')

const resultado = analisarAudio(buffer)

console.log('ToneMatch: análise concluída', resultado)

setMedidas(resultado)
setPresets(ajustarPresets(resultado))
setUrlAudio(endereco)

console.log('ToneMatch: presets atualizados')

      setTipo('Clean')
      setModulo('AMP')

      setMensagem('Sugestões de timbres geradas!')
    } catch (erro) {
      setMensagem(
        erro instanceof Error
          ? erro.message
          : 'Erro inesperado.'
      )
    } finally {
      if (contexto) {
        await contexto.close().catch(() => {})
      }

      setProcessando(false)
    }
  }

  function salvarPreset() {
    const linhas = [
      `TONEMATCH AI - ${tipo.toUpperCase()}`,
      'Matribox II - regulagens experimentais',
      ''
    ]

    for (const nome of MODULOS) {
      const item = presets[tipo][nome]

      linhas.push(
        `${nome} - ${item.modelo} - ${item.ligado ? 'ON' : 'OFF'}`
      )

      for (const [param, valor] of Object.entries(item.valores)) {
        const meta = obterControles(nome, item.modelo)
          .find(c => c.nome === param)

        linhas.push(
          `  ${param}: ${valor}${meta?.unidade || ''}`
        )
      }

      if (nome === 'DLY') {
        linhas.push(
          `  Sync: ${item.sync ? 'ON' : 'OFF'}`
        )

        if (item.sync) {
          linhas.push(`  Time: ${item.timeDiv}`)
        }

        linhas.push(
          `  Trail: ${item.trail ? 'ON' : 'OFF'}`
        )
      }

      if (nome === 'RVB') {
        linhas.push(
          `  Trail: ${item.trail ? 'ON' : 'OFF'}`
        )
      }

      linhas.push('')
    }

    linhas.push(
      'Os limites de alguns parâmetros ainda são provisórios.',
      'Este TXT não é um arquivo PRST compatível.'
    )

    const blob = new Blob(
      [linhas.join('\n')],
      { type: 'text/plain;charset=utf-8' }
    )

    const endereco = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = endereco
    link.download = `ToneMatch_${tipo}.txt`
    link.click()

    setTimeout(() => URL.revokeObjectURL(endereco), 1000)
  }

  const controles = obterControles(modulo, atual.modelo)

  const botao = {
    padding: '12px 18px',
    background: '#6140d9',
    color: 'white',
    border: 'none',
    borderRadius: 9,
    fontWeight: 700,
    cursor: 'pointer'
  }

  const painel = {
    padding: 20,
    marginTop: 18,
    background: '#101729',
    border: '1px solid #35405e',
    borderRadius: 12
  }

  return (
    <section style={{
      background: '#171d30',
      color: '#ffffff',
      border: '1px solid #35405e',
      borderRadius: 16,
      padding: 22,
      marginTop: 24
    }}>
      <h2>🎸 ToneMatch AI — Matribox II</h2>

      <p style={{ color: '#afbad0' }}>
        Gerador visual de presets Clean, Drive e Solo.
      </p>

      <button
        type="button"
        onClick={gerarTimbres}
        disabled={processando || !arquivo}
        style={{
          ...botao,
          opacity: processando ? 0.6 : 1
        }}
      >
        {processando
          ? 'Processando guitarra...'
          : '✨ Gerar timbres com IA'}
      </button>

      <p role="status" style={{ color: '#38bdf8' }}>
        {mensagem}
      </p>

      {urlAudio && (
        <div style={painel}>
          <h3>Guitarra extraída</h3>

          <audio
            controls
            src={urlAudio}
            style={{ width: '100%' }}
          />

          <p>
            <a
              href={urlAudio}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#38bdf8' }}
            >
              Ouvir ou baixar guitar.wav
            </a>
          </p>
        </div>
      )}

      <div style={painel}>
        <div style={{
          display: 'flex',
          gap: 9,
          flexWrap: 'wrap',
          marginBottom: 20
        }}>
          {['Clean', 'Drive', 'Solo'].map(nome => (
            <button
              key={nome}
              type="button"
              onClick={() => {
                setTipo(nome)
                setModulo('AMP')
              }}
              style={{
                ...botao,
                background: tipo === nome
                  ? '#7048ed'
                  : '#28223c'
              }}
            >
              {nome}
            </button>
          ))}
        </div>

        <h3>01 A — {tipo.toUpperCase()}</h3>

        <p style={{
          color: '#afbad0',
          fontSize: 12
        }}>
          MATRIBOX II / FX CHAIN
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 7
        }}>
          {MODULOS.map(nome => {
            const item = presets[tipo][nome]
            const selecionado = nome === modulo

            return (
              <button
                key={nome}
                type="button"
                onClick={() => setModulo(nome)}
                style={{
                  minWidth: 0,
                  padding: '13px 3px',
                  borderRadius: 8,
                  border: `2px solid ${
                    selecionado ? CORES[nome] : '#3a4055'
                  }`,
                  background: selecionado
                    ? '#303147'
                    : '#1b2030',
                  color: CORES[nome],
                  opacity: item.ligado ? 1 : 0.55,
                  cursor: 'pointer'
                }}
              >
                <strong style={{ fontSize: 12 }}>
                  {nome}
                </strong>

                <div style={{
                  fontSize: 10,
                  marginTop: 5,
                  color: '#ffffff'
                }}>
                  {item.ligado ? 'ON' : 'OFF'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={painel}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12
        }}>
          <h3 style={{
            color: CORES[modulo],
            margin: 0
          }}>
            {modulo} — Edição
          </h3>

          <label>
            <input
              type="checkbox"
              checked={atual.ligado}
              onChange={e => atualizar({
                ligado: e.target.checked
              })}
            />
            {' '}
            {atual.ligado ? 'ON' : 'OFF'}
          </label>
        </div>

        <label style={{
          display: 'block',
          marginTop: 20,
          fontSize: 13,
          color: '#bac6d8'
        }}>
          Current Effect
        </label>

        <select
          value={atual.modelo}
          onChange={e => selecionarModelo(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            background: '#252c40',
            color: '#ffffff',
            border: '1px solid #525e7a',
            borderRadius: 8,
            marginTop: 7
          }}
        >
          {MODELOS[modulo].map(nome => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>

        <div style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 20,
          marginTop: 25
        }}>
          {controles
            .filter(c =>
              !(modulo === 'DLY' && atual.sync && c.nome === 'Time')
            )
            .map(c => (
              <label key={c.nome}>
                <span style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 10
                }}>
                  <strong>{c.nome}</strong>

                  <span style={{
                    color: CORES[modulo]
                  }}>
                    {atual.valores[c.nome] ?? c.valor}
                    {c.unidade ? ` ${c.unidade}` : ''}
                  </span>
                </span>

                <input
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={atual.valores[c.nome] ?? c.valor}
                  onChange={e => alterarParametro(
                    c.nome,
                    e.target.value
                  )}
                  style={{
                    width: '100%',
                    accentColor: CORES[modulo]
                  }}
                />
              </label>
            ))}
        </div>

        {modulo === 'DLY' && (
          <div style={{
            marginTop: 25,
            display: 'grid',
            gap: 16
          }}>
            <label>
              <input
                type="checkbox"
                checked={atual.sync}
                onChange={e => atualizar({
                  sync: e.target.checked
                })}
              />
              {' '}Sync
            </label>

            {atual.sync && (
              <label>
                <strong>Time — Divisão musical</strong>

                <select
                  value={atual.timeDiv}
                  onChange={e => atualizar({
                    timeDiv: e.target.value
                  })}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: 10,
                    marginTop: 10,
                    background: '#252c40',
                    color: '#ffffff',
                    borderRadius: 8
                  }}
                >
                  {[
                    '1/1', '1/2', '1/4', '1/8',
                    '1/16', '1/32'
                  ].map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <input
                type="checkbox"
                checked={atual.trail}
                onChange={e => atualizar({
                  trail: e.target.checked
                })}
              />
              {' '}Trail
            </label>
          </div>
        )}

        {modulo === 'RVB' && (
          <label style={{
            display: 'block',
            marginTop: 25
          }}>
            <input
              type="checkbox"
              checked={atual.trail}
              onChange={e => atualizar({
                trail: e.target.checked
              })}
            />
            {' '}Trail
          </label>
        )}

        <p style={{
          fontSize: 12,
          lineHeight: 1.7,
          color: '#aebbd0',
          marginTop: 22
        }}>
          Os controles confirmados no software oficial
          estão representados com seus nomes e unidades.
          As faixas numéricas ainda não verificadas
          são provisórias. Outros modelos podem
          apresentar controles diferentes.
        </p>
      </div>

      <div style={painel}>
        <h3>📊 Referência sonora</h3>

        {medidas ? (
          <p>
            Graves: {medidas.graves.toFixed(1)}% |
            Médios: {medidas.medios.toFixed(1)}% |
            Agudos: {medidas.agudos.toFixed(1)}%
          </p>
        ) : (
          <p style={{ color: '#bac6d8' }}>
            Presets iniciais disponíveis.
            Analise a música para gerar sugestões
            de equalização.
          </p>
        )}

        <button
          type="button"
          onClick={salvarPreset}
          style={botao}
        >
          ⬇ Salvar regulagens do {tipo}
        </button>

        <p style={{
          color: '#bac6d8',
          fontSize: 12
        }}>
          Salva um arquivo TXT para consulta.
          A exportação PRST ainda não está disponível.
        </p>
      </div>
    </section>
  )
}
