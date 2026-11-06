
export default function PerfilSonoro({ analise }) {
  if (!analise) return null

  const { graves, medios, agudos, dinamica } = analise

  if (![graves, medios, agudos, dinamica].every(Number.isFinite)) {
    return null
  }

  function interpretarMedios() {
    if (medios >= 65) {
      return {
        titulo: 'Predominância de médios',
        descricao:
          'A maior parte da energia medida está concentrada nas frequências médias.'
      }
    }

    if (medios >= 40) {
      return {
        titulo: 'Médios relevantes',
        descricao:
          'As frequências médias representam uma parcela importante do sinal.'
      }
    }

    return {
      titulo: 'Médios menos predominantes',
      descricao:
        'As outras regiões de frequência possuem maior participação relativa.'
    }
  }

  function interpretarGraves() {
    if (graves < 10) {
      return {
        titulo: 'Graves relativamente reduzidos',
        descricao:
          'A faixa grave representa uma pequena parcela da energia analisada.'
      }
    }

    if (graves < 30) {
      return {
        titulo: 'Graves presentes',
        descricao:
          'Existe participação perceptível da região grave na distribuição espectral.'
      }
    }

    return {
      titulo: 'Forte participação dos graves',
      descricao:
        'A região grave concentra uma parcela elevada da energia analisada.'
    }
  }

  function interpretarAgudos() {
    if (agudos < 10) {
      return {
        titulo: 'Menor participação dos agudos',
        descricao:
          'A energia acima de 2 kHz é relativamente pequena.'
      }
    }

    if (agudos < 30) {
      return {
        titulo: 'Agudos presentes',
        descricao:
          'As frequências altas possuem participação moderada na distribuição medida.'
      }
    }

    return {
      titulo: 'Forte participação dos agudos',
      descricao:
        'Uma parcela elevada da energia está concentrada nas frequências superiores.'
    }
  }

  const interpretacoes = [
    {
      icone: '🎚️',
      ...interpretarMedios()
    },
    {
      icone: '🎸',
      ...interpretarGraves()
    },
    {
      icone: '✨',
      ...interpretarAgudos()
    },
    {
      icone: '📈',
      titulo: 'Variação de intensidade',
      descricao:
        `A diferença estimada entre janelas analisadas foi de ${dinamica.toFixed(1)} dB. Essa medida não identifica automaticamente compressão ou sustain.`
    }
  ]

  return (
    <section
      style={{
        marginTop: 24,
        padding: 24,
        background: '#171d30',
        border: '1px solid #35405e',
        borderRadius: 14,
        color: '#ffffff'
      }}
    >
      <h3 style={{ textAlign: 'center' }}>
        🎸 Perfil Sonoro da Guitarra
      </h3>

      <p
        style={{
          textAlign: 'center',
          color: '#aab6cc'
        }}
      >
        Interpretação das características medidas
        na guitarra extraída.
      </p>

      <div style={{ marginTop: 24 }}>
        {interpretacoes.map((item, index) => (
          <div
            key={index}
            style={{
              background: '#101729',
              border: '1px solid #35405e',
              borderRadius: 12,
              padding: 18,
              marginBottom: 14,
              textAlign: 'left'
            }}
          >
            <h4 style={{ marginTop: 0 }}>
              {item.icone} {item.titulo}
            </h4>

            <p
              style={{
                color: '#aab6cc',
                lineHeight: 1.7,
                marginBottom: 0
              }}
            >
              {item.descricao}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          background: '#101729',
          borderRadius: 10,
          color: '#aab6cc',
          fontSize: 13,
          lineHeight: 1.7
        }}
      >
        <strong>ℹ️ Sobre esta interpretação</strong>

        <p>
          Os resultados descrevem a distribuição
          de energia do áudio extraído.
          Resíduos de outros instrumentos podem
          influenciar as medições.
        </p>

        <p>
          Estas interpretações seguem regras
          iniciais de análise espectral.
          Ainda não representam identificação
          de equipamentos ou recomendações
          automáticas de regulagens.
        </p>
      </div>
    </section>
  )
}
