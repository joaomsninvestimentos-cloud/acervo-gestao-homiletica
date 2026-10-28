// Acervo & Gestão Homilética — Tela Limpa + Gavetas Específicas + IA Conversacional
(function () {
  const STORAGE_KEY = 'acervo_homiletico_data_v1';
  const THEME_KEY = 'acervo_homiletico_dark_v1';
  const CHAT_KEY = 'acervo_homiletico_ai_chat_v1';
  const GEMINI_KEY_STORAGE = 'acervo_homiletico_gemini_key_v1';

  let acervo = [];
  // activeView:
  //   null / 'clean' -> TELA LIMPA (nenhuma gaveta aberta!)
  //   'theme:<Tema>' -> Abre apenas a gaveta daquele tema específico
  //   'status:pregada' | 'status:pronto' | 'status:acervo' -> Abre apenas a gaveta daquela lista
  //   'ia' -> Abre o estúdio da IA Conversacional
  let activeView = 'clean';
  let innerStatusFilter = 'todos'; // Filtro interno opcional dentro de uma gaveta aberta

  let searchQuery = '';
  let currentSermonId = null;
  let currentVersion = 'NVT';
  let compareAllVersions = false;

  // Pulpit Mode State
  let pulpitFontSize = 1.14;
  let pulpitSeconds = 0;
  let pulpitTimerInterval = null;

  // Web Audio API Ambient Worship Pad
  let audioCtx = null;
  let padNodes = [];
  let padPlaying = false;
  let padKey = 'G';

  // Conversational AI State
  let chatHistory = [];
  let generatedDraftsMap = {};

  const KEY_FREQS = {
    'C': [130.81, 196.00, 261.63, 329.63, 392.00],
    'D': [146.83, 220.00, 293.66, 369.99, 440.00],
    'E': [164.81, 246.94, 329.63, 415.30, 493.88],
    'F': [174.61, 261.63, 349.23, 440.00, 523.25],
    'G': [98.00,  146.83, 196.00, 246.94, 293.66],
    'A': [110.00, 164.81, 220.00, 277.18, 329.63]
  };

  const THEME_DRAWERS_META = [
    {
      id: 'Restauração',
      shortName: 'Restauração',
      icon: '🏺',
      title: 'Gaveta: Restauração, Esperança & Renovo',
      desc: 'Cura da alma, recomeços na casa do Oleiro, consolo no vale e renovação de forças.'
    },
    {
      id: 'Deserto & Provação',
      shortName: 'Deserto & Prova',
      icon: '🏜️',
      title: 'Gaveta: Deserto, Provação & Perseverança',
      desc: 'A pedagogia de Deus no caminho mais longo, fidelidade na fornalha e vitória na crise.'
    },
    {
      id: 'Soberania',
      shortName: 'Soberania',
      icon: '👑',
      title: 'Gaveta: Soberania, Refúgio & Cuidado de Deus',
      desc: 'O Mestre no barco, segurança eterna em Cristo, onisciência e providência divina.'
    },
    {
      id: 'Oração',
      shortName: 'Oração & Clamor',
      icon: '🙏',
      title: 'Gaveta: Oração, Clamor & Batalha Espiritual',
      desc: 'Paz contra a ansiedade, intercessão estratégica, armadura de Deus e resposta ao clamor.'
    },
    {
      id: 'Sabedoria',
      shortName: 'Sabedoria',
      icon: '🦉',
      title: 'Gaveta: Sabedoria, Direção & Estações da Vida',
      desc: 'Discernimento para decisões, guarda do coração, liderança e foco na reconstrução.'
    },
    {
      id: 'Fé & Provisão',
      shortName: 'Fé & Provisão',
      icon: '🌾',
      title: 'Gaveta: Fé Audaciosa, Altar & Provisão (Javé-Jiré)',
      desc: 'Coragem para atravessar o Jordão, obediência no altar, milagres e provisão sobrenatural.'
    },
    {
      id: 'Graça & Salvação',
      shortName: 'Graça & Cruz',
      icon: '✝️',
      title: 'Gaveta: Graça, Cruz, Perdão & Salvação',
      desc: 'A Palavra viva, o Trono da Graça, o abraço do Pai, descanso para a alma e redenção.'
    },
    {
      id: 'Adoração & Louvor',
      shortName: 'Adoração',
      icon: '🎵',
      title: 'Gaveta: Adoração, Comunhão & Avivamento',
      desc: 'Louvor na caverna e à meia-noite, permanecer na Videira, culto racional e Espírito Santo.'
    }
  ];

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          acervo = parsed;
        }
      }
    } catch (e) {}
    if (!acervo || acervo.length === 0) {
      acervo = JSON.parse(JSON.stringify(window.ACERVO_INICIAL || []));
      saveData();
    }

    try {
      const savedChat = localStorage.getItem(CHAT_KEY);
      if (savedChat) chatHistory = JSON.parse(savedChat);
    } catch (e) {}

    if (!chatHistory || chatHistory.length === 0) {
      chatHistory = [
        {
          role: 'assistant',
          text: 'Graça e paz! Sou o seu **Assistente Homilético Conversacional**. 🙏\n\nConverse comigo para:\n1. **Desenvolver qualquer uma das 49 passagens da sua fila "Em Acervo"** em um esboço expositivo completo.\n2. **Criar uma nova pregação do zero** informando um texto bíblico ou tema.\n3. **Gerar Introdução, 3 Tópicos Expositivos (com aplicação prática), Conclusão, Apelo e Louvor Âncora** prontos para salvar direto na gaveta correspondente!'
        }
      ];
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(acervo));
    } catch (e) {}
    updateKPIs();
    renderDrawerHandles();
  }

  function saveChat() {
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistory.slice(-30)));
    } catch (e) {}
  }

  function resetToDefaultData() {
    if (confirm('Deseja restaurar as 61 passagens originais de fábrica?')) {
      acervo = JSON.parse(JSON.stringify(window.ACERVO_INICIAL || []));
      saveData();
      renderAll();
    }
  }

  // ==========================================
  // WORSHIP PAD SYNTHESIZER (WEB AUDIO API)
  // ==========================================
  function startWorshipPad(key) {
    if (key) padKey = key;
    stopWorshipPad();
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const freqs = KEY_FREQS[padKey] || KEY_FREQS['G'];
      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 2.0);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(620, audioCtx.currentTime);

      filter.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      freqs.forEach((f, idx) => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const voiceGain = audioCtx.createGain();

        osc1.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc2.type = 'sawtooth';

        osc1.frequency.setValueAtTime(f, audioCtx.currentTime);
        osc2.frequency.setValueAtTime(f * 1.003, audioCtx.currentTime);

        voiceGain.gain.setValueAtTime(idx === 0 ? 0.32 : 0.16, audioCtx.currentTime);

        osc1.connect(voiceGain);
        osc2.connect(voiceGain);
        voiceGain.connect(filter);

        osc1.start();
        osc2.start();
        padNodes.push(osc1, osc2);
      });

      padPlaying = true;
      updatePadUI();
    } catch (e) {}
  }

  function stopWorshipPad() {
    padNodes.forEach((n) => {
      try { n.stop(); n.disconnect(); } catch (e) {}
    });
    padNodes = [];
    padPlaying = false;
    updatePadUI();
  }

  function toggleWorshipPad(key) {
    if (padPlaying && (!key || key === padKey)) {
      stopWorshipPad();
    } else {
      startWorshipPad(key || padKey);
    }
  }

  function updatePadUI() {
    const pulse = document.getElementById('padPulse');
    const label = document.getElementById('padStatusText');
    const btn = document.getElementById('padToggleBtn');
    const pulpitPadBtn = document.getElementById('pulpitPadBtn');

    document.querySelectorAll('.key-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.key === padKey);
    });

    if (pulse) pulse.classList.toggle('playing', padPlaying);
    if (label) {
      label.textContent = padPlaying
        ? `Fundo Musical Ativo (Tom: ${padKey} Maior)`
        : `Fundo de Oração / Púlpito (Tom: ${padKey})`;
    }
    if (btn) {
      btn.classList.toggle('playing', padPlaying);
      btn.textContent = padPlaying ? '⏹ Parar Pad' : '🎹 Tocar Pad';
    }
    if (pulpitPadBtn) {
      pulpitPadBtn.textContent = padPlaying ? `⏹ Parar Pad (${padKey})` : `🎹 Fundo de Oração (${padKey})`;
    }
  }

  function updateKPIs() {
    const total = acervo.length;
    const cPregada = acervo.filter((x) => x.status === 'pregada').length;
    const cPronto = acervo.filter((x) => x.status === 'pronto').length;
    const cAcervo = acervo.filter((x) => x.status === 'acervo').length;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('kpiTotal', total);
    setEl('kpiPregada', cPregada);
    setEl('kpiPronto', cPronto);
    setEl('kpiAcervo', cAcervo);
  }

  // Render the 8 Compact Drawer Handles at the top
  function renderDrawerHandles() {
    const grid = document.getElementById('drawerHandlesGrid');
    if (!grid) return;

    grid.innerHTML = THEME_DRAWERS_META.map((meta) => {
      const count = acervo.filter((x) => x.tema === meta.id).length;
      const viewId = `theme:${meta.id}`;
      const isActive = activeView === viewId;
      return `
        <button type="button" class="drawer-handle-btn ${isActive ? 'active' : ''}" data-open-theme="${meta.id}" title="${meta.title}">
          <span class="handle-left">
            <span class="handle-icon">${meta.icon}</span>
            <span class="handle-name">${meta.shortName}</span>
          </span>
          <span class="handle-badge">${count}</span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.drawer-handle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tema = btn.dataset.openTheme;
        const targetView = `theme:${tema}`;
        // Clicking the already open drawer closes it and returns to Tela Limpa!
        if (activeView === targetView) {
          activeView = 'clean';
        } else {
          activeView = targetView;
          innerStatusFilter = 'todos';
        }
        renderAll();
      });
    });
  }

  function statusLabel(status) {
    if (status === 'pregada') return 'Exposição Pregada';
    if (status === 'pronto') return 'Esboço Pronto';
    return 'Em Acervo';
  }

  function renderCardHTML(item) {
    const badgeClass = `status-${item.status}`;
    const nextAction = item.status === 'acervo'
      ? { to: 'pronto', label: '➔ Esboço Pronto' }
      : item.status === 'pronto'
        ? { to: 'pregada', label: '✓ Marcar Pregada' }
        : { to: 'pronto', label: '↺ Reagendar' };

    return `
      <article class="sermon-card" data-id="${item.id}">
        <div class="card-top">
          <span class="ref-pill">📖 ${item.referencia}</span>
          <span class="status-badge ${badgeClass}">${statusLabel(item.status)}</span>
        </div>
        <h3 class="card-title">${item.titulo}</h3>
        <div class="card-verse-preview">${item.versoes?.NVT || ''}</div>
        <div class="card-worship">
          <span>🎵 <strong>${item.louvor?.titulo || 'Louvor Âncora'}</strong> — ${item.louvor?.artista || ''}</span>
          <span style="font-weight:700;color:var(--accent-gold);">Tom ${item.louvor?.tomPad || 'G'}</span>
        </div>
        <div class="card-tags">
          <span class="tag-item">🏷️ ${item.tema}</span>
          ${(item.tags || []).slice(0, 2).map((tg) => `<span class="tag-item">#${tg}</span>`).join('')}
        </div>
        <div class="card-footer">
          <span class="card-meta">📅 ${item.dataMinistracao || 'Sem data'}</span>
          <div class="card-actions">
            ${item.status === 'acervo' ? `
              <button class="mini-btn ai-mini ai-expand-btn" data-id="${item.id}" title="Gerar exposição profunda desta passagem com a IA">
                🤖 Gerar c/ IA
              </button>
            ` : ''}
            <button class="mini-btn quick-move-btn" data-id="${item.id}" data-to="${nextAction.to}">
              ${nextAction.label}
            </button>
            <button class="mini-btn primary open-card-btn" data-id="${item.id}">
              Abrir
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // ==========================================
  // CONVERSATIONAL AI HOMILETIC GENERATOR
  // ==========================================
  function inferThemeFromPrompt(promptText) {
    const p = promptText.toLowerCase();
    if (p.includes('deserto') || p.includes('prova') || p.includes('fornalha') || p.includes('crise') || p.includes('luta')) return 'Deserto & Provação';
    if (p.includes('oraç') || p.includes('ansiedade') || p.includes('clamor') || p.includes('batalha') || p.includes('jejum')) return 'Oração';
    if (p.includes('sabedoria') || p.includes('decis') || p.includes('provérbios') || p.includes('neemias') || p.includes('tempo')) return 'Sabedoria';
    if (p.includes('fé') || p.includes('provisão') || p.includes('milagre') || p.includes('jiré') || p.includes('jordão')) return 'Fé & Provisão';
    if (p.includes('graça') || p.includes('cruz') || p.includes('perdão') || p.includes('salvação') || p.includes('sangue')) return 'Graça & Salvação';
    if (p.includes('adoração') || p.includes('louvor') || p.includes('espírito') || p.includes('culto') || p.includes('videira')) return 'Adoração & Louvor';
    if (p.includes('soberania') || p.includes('barco') || p.includes('tempestade') || p.includes('pastor') || p.includes('refúgio')) return 'Soberania';
    return 'Restauração';
  }

  function suggestWorshipForTheme(tema) {
    const map = {
      'Restauração': { titulo: 'Bondade de Deus', artista: 'Isaías Saad', tomPad: 'G', trecho: 'És fiel em todo tempo / Em todo tempo Tu és tão, tão bom / Com todo fôlego que tenho, cantarei da bondade de Deus...' },
      'Deserto & Provação': { titulo: 'Deserto', artista: 'Maria Marçal', tomPad: 'C', trecho: 'O deserto não é o meu lugar de morrer, é lugar de aprender / Tu estás cuidando de mim...' },
      'Soberania': { titulo: 'Escape', artista: 'Renascer Praise', tomPad: 'G', trecho: 'Tu és o meu escape, meu lugar seguro / Quando tudo desabar, em Ti me refugio...' },
      'Oração': { titulo: 'Aquieta Minh\'alma', artista: 'Ministério Zoe', tomPad: 'F', trecho: 'Aquieta minh\'alma, faz meu coração ouvir Tua voz / Me chama pra perto...' },
      'Sabedoria': { titulo: 'Guia-me', artista: 'Daniela Araújo', tomPad: 'A', trecho: 'Guia-me pela Tua Palavra, ilumina os meus passos no caminho eterno...' },
      'Fé & Provisão': { titulo: 'Deus Proverá', artista: 'Gabriela Gomes', tomPad: 'D', trecho: 'Mesmo quando tudo parece perdido, Deus proverá / No monte do Senhor se proverá...' },
      'Graça & Salvação': { titulo: 'Tua Graça Me Basta', artista: 'Davi Sacer', tomPad: 'D', trecho: 'A Tua graça me basta, Teu poder se aperfeiçoa na minha fraqueza...' },
      'Adoração & Louvor': { titulo: 'Lugar Secreto', artista: 'Gabriela Rocha', tomPad: 'C', trecho: 'Tu és tudo o que eu mais quero, o meu fôlego, a minha vida...' }
    };
    return map[tema] || map['Restauração'];
  }

  function extractBibleReference(text) {
    const regex = /((?:[123]\s*)?[A-ZÀ-Ú][a-zà-ú]+\s+\d+(?::\d+(?:-\d+)?)?)/;
    const m = text.match(regex);
    return m ? m[1].trim() : null;
  }

  function generateLocalHomileticResponse(userPrompt, sourceItem) {
    const matchedExisting = sourceItem || acervo.find((x) =>
      userPrompt.toLowerCase().includes(x.referencia.toLowerCase()) ||
      (x.referencia.split(':')[0] && userPrompt.toLowerCase().includes(x.referencia.split(':')[0].toLowerCase()))
    );

    const ref = matchedExisting?.referencia || extractBibleReference(userPrompt) || 'Salmos 126:1-6';
    const livro = matchedExisting?.livro || ref.replace(/\s+\d+.*$/, '').trim() || 'Salmos';
    const tema = matchedExisting?.tema || inferThemeFromPrompt(userPrompt);
    const louvor = matchedExisting?.louvor?.titulo ? matchedExisting.louvor : suggestWorshipForTheme(tema);

    const cleanPromptTopic = userPrompt
      .replace(/crie|gere|faça|esboço|exposição|pregação|sobre|para|texto|em/gi, '')
      .trim();

    const titulo = matchedExisting?.titulo
      ? `${matchedExisting.titulo}`
      : `A Fidelidade de Deus em ${ref}: ${cleanPromptTopic ? cleanPromptTopic.slice(0, 48) : 'Fé e Renovação Espiritual'}`;

    const proposicao = `A revelação bíblica de ${ref} nos ensina que o caráter fiel de Deus governa cada estação da nossa história, transformando a nossa fragilidade em testemunho vivo da Sua graça (${tema}).`;

    const nvtBase = matchedExisting?.versoes?.NVT ||
      `“Texto bíblico base de ${ref} na Nova Versão Transformadora (NVT) — proclamando a fidelidade pactual do Senhor e o Seu cuidado soberano sobre aqueles que Nele confiam.” (${ref} – NVT)`;

    const apoio = matchedExisting?.textosApoio?.length
      ? matchedExisting.textosApoio
      : ['Romanos 8:28', 'Lamentações 3:22-23', 'Hebreus 4:16', 'Filipenses 4:6-7'];

    const draft = {
      id: matchedExisting ? matchedExisting.id : ('ia-sermao-' + Date.now()),
      isExistingId: Boolean(matchedExisting),
      status: 'pronto',
      titulo,
      proposicao,
      referencia: ref,
      livro,
      tema,
      tags: [tema, 'Exposição Bíblica', 'Gerado com IA', livro],
      dataMinistracao: 'Pronto para Ministrar',
      localMinistracao: 'Culto de Celebração / Ensino',
      versoes: {
        NVT: nvtBase,
        NVI: nvtBase.replace('NVT', 'NVI'),
        NTLH: nvtBase.replace('NVT', 'NTLH'),
        MENSAGEM: nvtBase.replace('NVT', 'A Mensagem')
      },
      textosApoio: apoio,
      louvor: {
        titulo: louvor.titulo,
        artista: louvor.artista,
        trecho: louvor.trecho,
        youtubeUrl: louvor.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(louvor.titulo + ' ' + louvor.artista)}`,
        youtubeId: louvor.youtubeId || '',
        tomPad: louvor.tomPad || 'G'
      },
      esboco: {
        introducao: `No contexto histórico e canônico de ${livro} (${ref}), o Espírito Santo confronta a tendência humana ao abatimento e aponta para a soberania e aliança do Senhor. Ao examinarmos esta passagem sob uma ótica expositiva e pastoral, descobrimos três verdades transformadoras para a igreja hoje.`,
        topicos: [
          {
            titulo: `I. O Diagnóstico da Condição Humana Diante do Texto (${ref})`,
            exposicao: `O texto começa expondo a realidade concreta vivida pelo povo de Deus em ${livro}. Longe de esconder as tensões da jornada, a Escritura mostra que até os servos mais fiéis enfrentam momentos em que os recursos naturais se esgotam para que a glória seja exclusivamente do Senhor.`,
            aplicacao: `Reconheça diante de Deus onde suas próprias forças chegaram ao limite hoje. A honestidade no altar é o primeiro passo para o milagre.`
          },
          {
            titulo: `II. A Intervenção Pactual do Caráter de Deus (${apoio.slice(0, 2).join('; ')})`,
            exposicao: `Em diálogo direto com ${apoio.slice(0, 2).join(' e ')}, percebemos o movimento gracioso de Deus (Hesed / Charis). Ele não apenas contempla a necessidade do Seu povo à distância, mas entra na história com Sua Palavra viva, trazendo direção, consolo e livramento no tempo oportuno.`,
            aplicacao: `Troque a ansiedade pela meditação na promessa: o que Deus falou a respeito da sua casa e do seu chamado não voltará vazio.`
          },
          {
            titulo: `III. A Resposta Prática de Fé, Obediência e Adoração`,
            exposicao: `A exposição de ${ref} culmina em um chamado à ação espiritual. A fé bíblica genuína não é passiva; ela se levanta em obediência, reconstrói o altar e glorifica a Cristo antes mesmo de ver a nuvem de chuva no horizonte.`,
            aplicacao: `Saia deste culto com uma decisão prática de obediência, perdão ou perseverança durante esta semana.`
          }
        ],
        conclusao: `Em ${ref}, contemplamos a suficiência de Cristo para sustentar a Sua igreja. O mesmo Deus que agiu com poder nas páginas de ${livro} continua escrevendo histórias de redenção hoje.`,
        apelo: `Ao som do louvor âncora "${louvor.titulo}" (${louvor.artista}, Tom ${louvor.tomPad}), convide a igreja a ficar de pé e abrir o coração para uma oração de entrega, renovo e consagração no altar.`
      }
    };

    const draftKey = 'draft_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    generatedDraftsMap[draftKey] = draft;

    const replyText = `Preparei a **Exposição Homilética Completa** para **${ref}** (*${titulo}*), pronta para a **Gaveta: ${tema}**!\n\n` +
      `🎯 **Proposição Central:** ${proposicao}\n\n` +
      `📖 **Introdução Contextual:** ${draft.esboco.introducao}\n\n` +
      `🔹 **${draft.esboco.topicos[0].titulo}**\n• *Exposição:* ${draft.esboco.topicos[0].exposicao}\n• *Aplicação Pastoral:* ${draft.esboco.topicos[0].aplicacao}\n\n` +
      `🔹 **${draft.esboco.topicos[1].titulo}**\n• *Exposição:* ${draft.esboco.topicos[1].exposicao}\n• *Aplicação Pastoral:* ${draft.esboco.topicos[1].aplicacao}\n\n` +
      `🔹 **${draft.esboco.topicos[2].titulo}**\n• *Exposição:* ${draft.esboco.topicos[2].exposicao}\n• *Aplicação Pastoral:* ${draft.esboco.topicos[2].aplicacao}\n\n` +
      `🔥 **Conclusão & Apelo:** ${draft.esboco.conclusao} — *${draft.esboco.apelo}*\n\n` +
      `🎵 **Louvor Âncora Sugerido:** *${draft.louvor.titulo}* (${draft.louvor.artista}) — Tom **${draft.louvor.tomPad}**`;

    return { text: replyText, draftKey, draft };
  }

  async function callGeminiIfConfigured(userPrompt, fallbackFn) {
    const apiKey = localStorage.getItem(GEMINI_KEY_STORAGE);
    if (!apiKey || !apiKey.trim()) {
      return fallbackFn();
    }
    try {
      const sysInstruction = `Você é um Mentor Homilético e Teólogo Pastoral. Crie esboços expositivos profundos, bíblicos (baseados na NVT) e práticos. Responda exclusivamente em JSON válido com as chaves: titulo, proposicao, referencia, livro, tema (escolha exatamente um entre: "Restauração", "Deserto & Provação", "Soberania", "Oração", "Sabedoria", "Fé & Provisão", "Graça & Salvação", "Adoração & Louvor"), nvt, textosApoio (array de strings), louvorTitulo, louvorArtista, louvorTrecho, louvorTom ("C","D","E","F","G" ou "A"), introducao, topico1Titulo, topico1Exposicao, topico1Aplicacao, topico2Titulo, topico2Exposicao, topico2Aplicacao, topico3Titulo, topico3Exposicao, topico3Aplicacao, conclusao, apelo.`;
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${sysInstruction}\n\nPedido do Pregador: ${userPrompt}` }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      if (!resp.ok) throw new Error('Status ' + resp.status);
      const data = await resp.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawJson);

      const draft = {
        id: 'ia-gemini-' + Date.now(),
        status: 'pronto',
        titulo: parsed.titulo || 'Exposição Bíblica',
        proposicao: parsed.proposicao || '',
        referencia: parsed.referencia || 'Bíblia Sagrada',
        livro: parsed.livro || 'Bíblia',
        tema: parsed.tema || 'Restauração',
        tags: [parsed.tema || 'Restauração', 'Gerado c/ Gemini IA', parsed.livro || 'Exposição'],
        dataMinistracao: 'Pronto para Ministrar',
        localMinistracao: 'Culto de Celebração',
        versoes: {
          NVT: parsed.nvt || '',
          NVI: parsed.nvt || '',
          NTLH: parsed.nvt || '',
          MENSAGEM: parsed.nvt || ''
        },
        textosApoio: Array.isArray(parsed.textosApoio) ? parsed.textosApoio : ['Romanos 8:28'],
        louvor: {
          titulo: parsed.louvorTitulo || 'Bondade de Deus',
          artista: parsed.louvorArtista || 'Isaías Saad',
          trecho: parsed.louvorTrecho || '',
          youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent((parsed.louvorTitulo || '') + ' ' + (parsed.louvorArtista || ''))}`,
          youtubeId: '',
          tomPad: parsed.louvorTom || 'G'
        },
        esboco: {
          introducao: parsed.introducao || '',
          topicos: [
            { titulo: parsed.topico1Titulo || 'I.', exposicao: parsed.topico1Exposicao || '', aplicacao: parsed.topico1Aplicacao || '' },
            { titulo: parsed.topico2Titulo || 'II.', exposicao: parsed.topico2Exposicao || '', aplicacao: parsed.topico2Aplicacao || '' },
            { titulo: parsed.topico3Titulo || 'III.', exposicao: parsed.topico3Exposicao || '', aplicacao: parsed.topico3Aplicacao || '' }
          ],
          conclusao: parsed.conclusao || '',
          apelo: parsed.apelo || ''
        }
      };

      const draftKey = 'draft_' + Date.now();
      generatedDraftsMap[draftKey] = draft;
      const text = `✨ **Esboço Expositivo Gerado via Gemini IA** para **${draft.referencia}** (*${draft.titulo}* — Gaveta: **${draft.tema}**):\n\n` +
        `🎯 **Proposição:** ${draft.proposicao}\n\n` +
        `📖 **Introdução:** ${draft.esboco.introducao}\n\n` +
        `🔹 **${draft.esboco.topicos[0].titulo}**\n${draft.esboco.topicos[0].exposicao}\n*👉 Aplicação:* ${draft.esboco.topicos[0].aplicacao}\n\n` +
        `🔹 **${draft.esboco.topicos[1].titulo}**\n${draft.esboco.topicos[1].exposicao}\n*👉 Aplicação:* ${draft.esboco.topicos[1].aplicacao}\n\n` +
        `🔹 **${draft.esboco.topicos[2].titulo}**\n${draft.esboco.topicos[2].exposicao}\n*👉 Aplicação:* ${draft.esboco.topicos[2].aplicacao}\n\n` +
        `🔥 **Conclusão & Apelo:** ${draft.esboco.conclusao} — ${draft.esboco.apelo}`;
      return { text, draftKey, draft };
    } catch (err) {
      return fallbackFn();
    }
  }

  function formatMarkdownSimple(str) {
    return (str || '')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function renderAIStudioView() {
    const acervoItems = acervo.filter((x) => x.status === 'acervo');
    const hasGeminiKey = Boolean(localStorage.getItem(GEMINI_KEY_STORAGE));

    return `
      <div class="ai-studio-wrapper">
        <div class="ai-studio-header">
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:1.35rem;">🤖</span>
              <h2 style="font-size:1.05rem;font-weight:800;">Assistente Homilético Conversacional (IA)</h2>
            </div>
            <p style="font-size:0.76rem;color:#E2E8F0;margin-top:2px;">
              Gere futuras pregações e exposições completas e salve direto na gaveta do tema correspondente.
            </p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="icon-btn" id="configureGeminiKeyBtn" title="Conectar chave gratuita do Google Gemini AI Studio (Opcional)">
              🔑 ${hasGeminiKey ? 'API Gemini Ativa' : 'API Gemini (Opcional)'}
            </button>
            <button class="icon-btn" id="clearAiChatBtn" title="Limpar conversa">
              🗑️ Limpar
            </button>
            <button class="icon-btn gold" id="closeAiToCleanBtn" title="Fechar IA e voltar para a Tela Limpa">
              ✕ Fechar (Tela Limpa)
            </button>
          </div>
        </div>

        <div class="ai-toolbar">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <span style="font-size:0.76rem;font-weight:700;color:var(--text-secondary);">
              💡 Expandir Passagem da Fila "Em Acervo" (${acervoItems.length}):
            </span>
            <select id="aiSelectAcervoItem" style="flex:1;min-width:210px;padding:7px 10px;border-radius:9px;border:1px solid var(--border-color);background:var(--bg-surface);color:var(--text-primary);font-size:0.8rem;">
              <option value="">-- Selecione uma das ${acervoItems.length} passagens em acervo para desenvolver --</option>
              ${acervoItems.map((it) => `<option value="${it.id}">[${it.tema}] ${it.referencia} — ${it.titulo}</option>`).join('')}
            </select>
            <button class="mini-btn primary" id="aiGenerateFromAcervoBtn">
              ✨ Gerar Exposição
            </button>
          </div>

          <div class="ai-quick-prompts">
            <button class="ai-prompt-chip" data-prompt="Crie um esboço expositivo completo sobre Salmos 23 (O Bom Pastor nos Vales e à Mesa) com aplicação pastoral e louvor âncora.">
              🐑 Esboço em Salmos 23
            </button>
            <button class="ai-prompt-chip" data-prompt="Elabore uma pregação expositiva em Ezequiel 37:1-14 (Profetizando Vida no Vale de Ossos Secos) para culto de avivamento.">
              🔥 Ezequiel 37 (Ossos Secos)
            </button>
            <button class="ai-prompt-chip" data-prompt="Crie uma exposição bíblica sobre como vencer a ansiedade e ter paz no coração com base em Mateus 6:25-34.">
              🕊️ Vencendo a Ansiedade (Mt 6)
            </button>
            <button class="ai-prompt-chip" data-prompt="Monte um sermão expositivo sobre Daniel 3:16-28 (O Quarto Homem na Fornalha Ardente) no tema Deserto & Provação.">
              🏜️ Daniel 3 (Na Fornalha)
            </button>
            <button class="ai-prompt-chip" data-prompt="Crie uma mensagem para Santa Ceia e família baseada em Lucas 15:11-24 (O Abraço do Pai Pródigo em Graça).">
              ✝️ O Abraço do Pai (Lc 15)
            </button>
          </div>
        </div>

        <div class="ai-messages-area" id="aiMessagesArea">
          ${chatHistory.map((msg) => `
            <div class="chat-bubble ${msg.role}">
              <div>${formatMarkdownSimple(msg.text)}</div>
              ${msg.draftKey && generatedDraftsMap[msg.draftKey] ? `
                <div class="ai-generated-card">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                    <div>
                      <span class="ref-pill">📖 ${generatedDraftsMap[msg.draftKey].referencia}</span>
                      <span class="tag-item">🗄️ Gaveta: ${generatedDraftsMap[msg.draftKey].tema}</span>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button class="mini-btn primary save-ai-draft-btn" data-draft-key="${msg.draftKey}">
                        📥 Salvar e Abrir Gaveta "${generatedDraftsMap[msg.draftKey].tema}"
                      </button>
                      <button class="mini-btn pulp-ai-draft-btn" data-draft-key="${msg.draftKey}">
                        🎙️ Abrir no Púlpito
                      </button>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <form class="ai-input-bar" id="aiChatForm">
          <textarea id="aiChatInput" rows="2" placeholder="Digite o versículo, tema ou pedido homilético (ex: 'Crie uma pregação expositiva sobre Salmos 121 com 3 pontos e louvor âncora')..."></textarea>
          <button type="submit" class="ai-send-btn">Enviar ➔</button>
        </form>
      </div>
    `;
  }

  async function handleSendAiMessage(promptText, sourceItem) {
    if (!promptText || !promptText.trim()) return;
    chatHistory.push({ role: 'user', text: promptText.trim() });
    saveChat();
    renderMainContent();

    const msgArea = document.getElementById('aiMessagesArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    const result = await callGeminiIfConfigured(promptText, () =>
      generateLocalHomileticResponse(promptText, sourceItem)
    );

    chatHistory.push({
      role: 'assistant',
      text: result.text,
      draftKey: result.draftKey
    });
    saveChat();
    renderMainContent();

    const updatedArea = document.getElementById('aiMessagesArea');
    if (updatedArea) updatedArea.scrollTop = updatedArea.scrollHeight;
  }

  function saveAiDraftToAcervo(draftKey, openInPulpitAfter) {
    const draft = generatedDraftsMap[draftKey];
    if (!draft) return;

    const existingIdx = acervo.findIndex((x) => x.id === draft.id || x.referencia.toLowerCase() === draft.referencia.toLowerCase());
    let savedId = draft.id;
    if (existingIdx >= 0) {
      savedId = acervo[existingIdx].id;
      acervo[existingIdx] = {
        ...acervo[existingIdx],
        ...draft,
        id: savedId,
        status: 'pronto'
      };
    } else {
      acervo.unshift(draft);
    }

    saveData();

    if (openInPulpitAfter) {
      const target = acervo.find((x) => x.id === savedId);
      if (target) openPulpitMode(target);
    } else {
      activeView = `theme:${draft.tema}`;
      innerStatusFilter = 'todos';
      renderAll();
      openSermonModal(savedId);
    }
  }

  // ==========================================
  // MAIN VIEW ROUTER (CLEAN STATE VS OPEN DRAWER)
  // ==========================================
  function renderMainContent() {
    const container = document.getElementById('mainViewContainer');
    if (!container) return;

    // Highlight active states on KPI strip and Bottom Nav
    document.querySelectorAll('[data-status-drawer]').forEach((el) => {
      const st = el.dataset.statusDrawer;
      const isMatch = (st === 'clean' && activeView === 'clean') || (activeView === `status:${st}`);
      el.classList.toggle('active', isMatch);
    });

    document.querySelectorAll('.nav-item').forEach((n) => {
      const nav = n.dataset.nav;
      const isMatch =
        (nav === 'clean' && activeView === 'clean') ||
        (nav === 'ia' && activeView === 'ia') ||
        (activeView === `status:${nav}`);
      n.classList.toggle('active', isMatch);
    });

    renderDrawerHandles();

    // 1. If IA Studio is open
    if (activeView === 'ia') {
      container.innerHTML = renderAIStudioView();
      bindAiStudioEvents();
      return;
    }

    // 2. If user is typing in the search bar, show matching results in an open search drawer
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matched = acervo.filter((item) => {
        const hay = [
          item.titulo,
          item.referencia,
          item.livro,
          item.tema,
          item.proposicao,
          item.louvor?.titulo,
          item.louvor?.artista,
          ...(item.tags || []),
          ...(item.textosApoio || []),
          item.versoes?.NVT
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });

      container.innerHTML = `
        <div class="opened-drawer-box">
          <div class="opened-drawer-topbar">
            <div>
              <h2 style="font-size:1.05rem;font-weight:800;">🔍 Resultado da Busca: "${searchQuery}" (${matched.length})</h2>
              <p style="font-size:0.78rem;color:var(--text-secondary);">Limpe a busca ou clique em Fechar para voltar à Tela Limpa.</p>
            </div>
            <button class="mini-btn primary" id="closeDrawerToCleanBtn">✕ Fechar (Tela Limpa)</button>
          </div>
          <div class="opened-drawer-body">
            <div class="cards-grid">
              ${matched.map(renderCardHTML).join('') || '<p style="color:var(--text-muted);">Nenhuma passagem encontrada.</p>'}
            </div>
          </div>
        </div>
      `;
      bindOpenedDrawerEvents(container);
      return;
    }

    // 3. TELA LIMPA (When NO drawer is open!)
    if (!activeView || activeView === 'clean') {
      container.innerHTML = `
        <div class="clean-canvas-state">
          <div class="clean-emblem">📖</div>
          <h2 class="clean-title">Santuário Homilético • Tela Limpa</h2>
          <p class="clean-subtitle">
            Nenhuma gaveta está aberta no momento para manter sua mente e visão descansadas.<br>
            Toque em <strong>qualquer uma das 8 Gavetas Temáticas acima</strong> (ou nas listas de status) para abrir somente o que está guardado dentro dela.
          </p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:20px;">
            <button class="icon-btn ai-glow" id="cleanOpenAiBtn" style="padding:10px 16px;font-size:0.84rem;">
              🤖 Conversar com a IA Homilética
            </button>
            <button class="icon-btn gold" id="cleanNewSermonBtn" style="padding:10px 16px;font-size:0.84rem;">
              ➕ Criar Novo Esboço
            </button>
          </div>
          <div class="clean-verse-quote">
            “Procura apresentar-te a Deus aprovado, como obreiro que não tem de que se envergonhar, que maneja bem a palavra da verdade.” — 2 Timóteo 2:15 (NVT)
          </div>
        </div>
      `;
      document.getElementById('cleanOpenAiBtn')?.addEventListener('click', () => {
        activeView = 'ia';
        renderAll();
      });
      document.getElementById('cleanNewSermonBtn')?.addEventListener('click', () => openEditorModal(null));
      return;
    }

    // 4. SPECIFIC THEME DRAWER OPEN (`theme:<Tema>`)
    if (activeView.startsWith('theme:')) {
      const temaId = activeView.replace('theme:', '');
      const meta = THEME_DRAWERS_META.find((m) => m.id === temaId) || {
        id: temaId,
        icon: '🗄️',
        title: `Gaveta: ${temaId}`,
        desc: 'Passagens e esboços catalogados neste tema.'
      };

      const allInTheme = acervo.filter((x) => x.tema === temaId);
      const filteredInTheme = innerStatusFilter === 'todos'
        ? allInTheme
        : allInTheme.filter((x) => x.status === innerStatusFilter);

      const cPreg = allInTheme.filter((x) => x.status === 'pregada').length;
      const cPron = allInTheme.filter((x) => x.status === 'pronto').length;
      const cAcer = allInTheme.filter((x) => x.status === 'acervo').length;

      container.innerHTML = `
        <div class="opened-drawer-box">
          <div class="opened-drawer-topbar">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:1.75rem;">${meta.icon}</div>
              <div>
                <h2 style="font-size:1.08rem;font-weight:800;">${meta.title}</h2>
                <p style="font-size:0.78rem;color:var(--text-secondary);">${meta.desc}</p>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <button class="mini-btn ai-mini" id="drawerAiNewBtn" data-theme="${meta.id}">
                🤖 Gerar Nova Pregação neste Tema c/ IA
              </button>
              <button class="mini-btn primary" id="closeDrawerToCleanBtn" title="Fechar esta gaveta e voltar à Tela Limpa">
                ✕ Fechar Gaveta (Tela Limpa)
              </button>
            </div>
          </div>

          <div class="opened-drawer-body">
            <!-- Filtro rápido interno da gaveta -->
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px dashed var(--border-color);">
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="mini-btn ${innerStatusFilter === 'todos' ? 'primary' : ''}" data-inner-status="todos">
                  Todos na Gaveta (${allInTheme.length})
                </button>
                <button class="mini-btn ${innerStatusFilter === 'pregada' ? 'primary' : ''}" data-inner-status="pregada">
                  ✅ Pregadas (${cPreg})
                </button>
                <button class="mini-btn ${innerStatusFilter === 'pronto' ? 'primary' : ''}" data-inner-status="pronto">
                  🔥 Esboço Pronto (${cPron})
                </button>
                <button class="mini-btn ${innerStatusFilter === 'acervo' ? 'primary' : ''}" data-inner-status="acervo">
                  💡 Em Acervo (${cAcer})
                </button>
              </div>
              <span style="font-size:0.74rem;color:var(--text-muted);">
                Toque em um cartão para abrir a ficha completa ou Modo Púlpito
              </span>
            </div>

            <div class="cards-grid">
              ${filteredInTheme.map(renderCardHTML).join('') || '<p style="color:var(--text-muted);padding:12px;">Nenhum item neste subfiltro.</p>'}
            </div>
          </div>
        </div>
      `;
      bindOpenedDrawerEvents(container);
      return;
    }

    // 5. SPECIFIC STATUS DRAWER OPEN (`status:pregada` | `status:pronto` | `status:acervo`)
    if (activeView.startsWith('status:')) {
      const st = activeView.replace('status:', '');
      const items = acervo.filter((x) => x.status === st);
      const titles = {
        pregada: { icon: '✅', title: 'Gaveta Lista 1: Exposição Pregada (Histórico)', desc: 'Sermões já ministrados com data, local, esboço expositivo e louvor âncora.' },
        pronto: { icon: '🔥', title: 'Gaveta Lista 2: Esboço Pronto (Prontos para Pregar)', desc: 'Sermões completos prontos para levar ao Modo Púlpito.' },
        acervo: { icon: '💡', title: 'Gaveta Lista 3: Em Acervo (49 Passagens na Fila)', desc: 'Toque em "🤖 Gerar c/ IA" em qualquer passagem para transformá-la em um Esboço Pronto.' }
      };
      const meta = titles[st] || titles.pronto;

      container.innerHTML = `
        <div class="opened-drawer-box">
          <div class="opened-drawer-topbar">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:1.75rem;">${meta.icon}</div>
              <div>
                <h2 style="font-size:1.08rem;font-weight:800;">${meta.title} (${items.length})</h2>
                <p style="font-size:0.78rem;color:var(--text-secondary);">${meta.desc}</p>
              </div>
            </div>
            <button class="mini-btn primary" id="closeDrawerToCleanBtn">
              ✕ Fechar Gaveta (Tela Limpa)
            </button>
          </div>
          <div class="opened-drawer-body">
            <div class="cards-grid">
              ${items.map(renderCardHTML).join('')}
            </div>
          </div>
        </div>
      `;
      bindOpenedDrawerEvents(container);
    }
  }

  function bindOpenedDrawerEvents(container) {
    document.getElementById('closeDrawerToCleanBtn')?.addEventListener('click', () => {
      activeView = 'clean';
      searchQuery = '';
      const searchInput = document.getElementById('searchInput');
      const clearBtn = document.getElementById('clearSearchBtn');
      if (searchInput) searchInput.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      renderAll();
    });

    container.querySelectorAll('[data-inner-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        innerStatusFilter = btn.dataset.innerStatus;
        renderMainContent();
      });
    });

    document.getElementById('drawerAiNewBtn')?.addEventListener('click', (e) => {
      const tema = e.currentTarget.dataset.theme;
      activeView = 'ia';
      renderAll();
      handleSendAiMessage(`Crie uma nova pregação expositiva completa e profunda dentro do tema "${tema}" com texto na NVT, 3 tópicos expositivos, aplicação prática e louvor âncora.`);
    });

    container.querySelectorAll('.sermon-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.quick-move-btn') || e.target.closest('.ai-expand-btn')) return;
        openSermonModal(card.dataset.id);
      });
    });

    container.querySelectorAll('.quick-move-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        changeSermonStatus(btn.dataset.id, btn.dataset.to);
      });
    });

    container.querySelectorAll('.ai-expand-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = acervo.find((x) => x.id === btn.dataset.id);
        if (!item) return;
        activeView = 'ia';
        renderAll();
        handleSendAiMessage(
          `Desenvolva em um Esboço Pronto completo a passagem do meu acervo: ${item.referencia} (${item.titulo}), no tema de ${item.tema}.`,
          item
        );
      });
    });
  }

  function bindAiStudioEvents() {
    document.getElementById('closeAiToCleanBtn')?.addEventListener('click', () => {
      activeView = 'clean';
      renderAll();
    });

    const form = document.getElementById('aiChatForm');
    const input = document.getElementById('aiChatInput');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input || !input.value.trim()) return;
      const text = input.value;
      input.value = '';
      handleSendAiMessage(text, null);
    });

    document.querySelectorAll('.ai-prompt-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        handleSendAiMessage(chip.dataset.prompt, null);
      });
    });

    document.getElementById('aiGenerateFromAcervoBtn')?.addEventListener('click', () => {
      const sel = document.getElementById('aiSelectAcervoItem');
      if (!sel || !sel.value) {
        alert('Selecione primeiro uma passagem da lista "Em Acervo" na caixa ao lado.');
        return;
      }
      const item = acervo.find((x) => x.id === sel.value);
      if (item) {
        handleSendAiMessage(
          `Desenvolva em um Esboço Pronto completo a passagem do meu acervo: ${item.referencia} (${item.titulo}), no tema de ${item.tema}.`,
          item
        );
      }
    });

    document.querySelectorAll('.save-ai-draft-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        saveAiDraftToAcervo(btn.dataset.draftKey, false);
      });
    });

    document.querySelectorAll('.pulp-ai-draft-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        saveAiDraftToAcervo(btn.dataset.draftKey, true);
      });
    });

    document.getElementById('clearAiChatBtn')?.addEventListener('click', () => {
      chatHistory = chatHistory.slice(0, 1);
      saveChat();
      renderMainContent();
    });

    document.getElementById('configureGeminiKeyBtn')?.addEventListener('click', () => {
      const current = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
      const val = prompt(
        'O Assistente Homilético já funciona 100% offline/integrado! Se desejar também conectar sua chave gratuita do Google Gemini AI Studio (gemini-2.0-flash), cole abaixo (ou deixe em branco para usar o motor local):',
        current
      );
      if (val !== null) {
        if (val.trim()) localStorage.setItem(GEMINI_KEY_STORAGE, val.trim());
        else localStorage.removeItem(GEMINI_KEY_STORAGE);
        renderMainContent();
      }
    });
  }

  function changeSermonStatus(id, newStatus) {
    const item = acervo.find((x) => x.id === id);
    if (!item) return;
    item.status = newStatus;
    if (newStatus === 'pregada') {
      const today = new Date().toISOString().slice(0, 10);
      const dataInput = prompt('Registrar data da ministração (AAAA-MM-DD):', item.dataMinistracao && item.dataMinistracao.includes('202') ? item.dataMinistracao : today);
      if (dataInput) item.dataMinistracao = dataInput;
      const localInput = prompt('Local / Culto de ministração:', item.localMinistracao || 'Culto de Celebração');
      if (localInput) item.localMinistracao = localInput;
    } else if (newStatus === 'pronto') {
      if (!item.dataMinistracao || item.dataMinistracao === 'Em Fila de Desenvolvimento') {
        item.dataMinistracao = 'Pronto para Ministrar';
      }
    }
    saveData();
    renderAll();
    if (currentSermonId === id) {
      openSermonModal(id);
    }
  }

  function openSermonModal(id) {
    const item = acervo.find((x) => x.id === id);
    if (!item) return;
    currentSermonId = id;
    currentVersion = 'NVT';
    compareAllVersions = false;

    const modal = document.getElementById('sermonDetailModal');
    const content = document.getElementById('sermonModalContent');
    if (!modal || !content) return;

    renderSermonModalInner(item);
    modal.classList.add('open');
  }

  function renderSermonModalInner(item) {
    const content = document.getElementById('sermonModalContent');
    if (!content) return;

    const vText = (item.versoes && item.versoes[currentVersion]) || item.versoes?.NVT || '';

    content.innerHTML = `
      <div class="modal-header">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
            <span class="ref-pill" style="background:rgba(229,184,91,0.22);color:#FDE68A;border-color:#E5B85B;">📖 ${item.referencia}</span>
            <span class="status-badge status-${item.status}">${statusLabel(item.status)}</span>
            <span style="font-size:0.75rem;color:#CBD5E1;">🗄️ Gaveta: ${item.tema} • 📅 ${item.dataMinistracao || ''}</span>
          </div>
          <h2 style="font-size:1.22rem;font-weight:800;line-height:1.3;">${item.titulo}</h2>
        </div>
        <button class="modal-close" id="closeDetailModalBtn" title="Fechar">✕</button>
      </div>

      <div class="modal-body">
        <div>
          <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;">
            Estágio no Fluxo Homilético (Toque para alterar status):
          </div>
          <div class="status-stepper">
            <button class="step-btn ${item.status === 'acervo' ? 'active-acervo' : ''}" data-set-status="acervo">
              💡 3. Em Acervo
            </button>
            <button class="step-btn ${item.status === 'pronto' ? 'active-pronto' : ''}" data-set-status="pronto">
              🔥 2. Esboço Pronto
            </button>
            <button class="step-btn ${item.status === 'pregada' ? 'active-pregada' : ''}" data-set-status="pregada">
              ✅ 1. Exposição Pregada
            </button>
          </div>
        </div>

        <div style="background:var(--accent-gold-soft);border-left:4px solid var(--accent-gold);padding:12px 14px;border-radius:0 12px 12px 0;">
          <div style="font-size:0.73rem;font-weight:800;color:var(--accent-gold);text-transform:uppercase;margin-bottom:3px;">
            🎯 Proposição Homilética Central
          </div>
          <div style="font-size:0.92rem;font-weight:600;color:var(--text-primary);">
            ${item.proposicao}
          </div>
        </div>

        <div class="bible-box">
          <div class="version-tabs">
            <div class="version-pill-group">
              ${['NVT', 'NVI', 'NTLH', 'MENSAGEM'].map((v) => `
                <button class="version-btn ${currentVersion === v && !compareAllVersions ? 'active' : ''}" data-version="${v}">
                  ${v === 'MENSAGEM' ? 'A Mensagem' : v}
                </button>
              `).join('')}
            </div>
            <button class="mini-btn" id="toggleCompareVersionsBtn">
              ${compareAllVersions ? 'Ver Versão Única' : '⚖️ Comparar as 4 Versões'}
            </button>
          </div>

          ${!compareAllVersions ? `
            <div class="bible-text-display">${vText}</div>
          ` : `
            <div class="compare-grid">
              <div class="compare-card"><strong>NVT (Nova Versão Transformadora)</strong>${item.versoes?.NVT || ''}</div>
              <div class="compare-card"><strong>NVI (Nova Versão Internacional)</strong>${item.versoes?.NVI || ''}</div>
              <div class="compare-card"><strong>NTLH (Linguagem de Hoje)</strong>${item.versoes?.NTLH || ''}</div>
              <div class="compare-card"><strong>A Mensagem (Paráfrase Pastoral)</strong>${item.versoes?.MENSAGEM || ''}</div>
            </div>
          `}

          <div style="margin-top:12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);">🔗 Textos de Apoio (Referências Cruzadas):</span>
            ${(item.textosApoio || []).map((ref) => `<span class="tag-item" style="font-weight:700;color:var(--accent-navy);border-color:var(--accent-gold);">${ref}</span>`).join('')}
          </div>
        </div>

        <div class="outline-section">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <h3 style="font-size:1rem;font-weight:800;">📜 Estrutura do Esboço Expositivo</h3>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="mini-btn ai-mini" id="modalAiEnrichBtn">🤖 Aprofundar Esboço com IA</button>
              <button class="mini-btn primary" id="openPulpitModeBtn">🎙️ Modo Púlpito (Tela Cheia)</button>
            </div>
          </div>

          <div class="topic-card">
            <h4>Introdução & Contexto Bíblico</h4>
            <p class="topic-exp">${item.esboco?.introducao || ''}</p>
          </div>

          ${(item.esboco?.topicos || []).map((t) => `
            <div class="topic-card">
              <h4>${t.titulo}</h4>
              <p class="topic-exp">${t.exposicao}</p>
              <div class="topic-app">
                <strong>💡 Aplicação Pastoral Prática:</strong> ${t.aplicacao}
              </div>
            </div>
          `).join('')}

          <div class="topic-card">
            <h4>Conclusão & Apelo de Ministração</h4>
            <p class="topic-exp"><strong>Conclusão:</strong> ${item.esboco?.conclusao || ''}</p>
            <div class="topic-app">
              <strong>🔥 Direcionamento para o Apelo:</strong> ${item.esboco?.apelo || ''}
            </div>
          </div>
        </div>

        <div class="worship-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
            <div>
              <div style="font-size:0.72rem;text-transform:uppercase;color:#E5B85B;font-weight:800;">
                🎵 Louvor Âncora Conectado à Mensagem
              </div>
              <h4 style="font-size:1.08rem;margin-top:2px;">${item.louvor?.titulo || ''} — <span style="color:#CBD5E1;font-weight:500;">${item.louvor?.artista || ''}</span></h4>
            </div>
            <span class="ref-pill" style="background:rgba(229,184,91,0.2);color:#FDE68A;">Tom: ${item.louvor?.tomPad || 'G'} Maior</span>
          </div>

          <div class="worship-lyric">“${item.louvor?.trecho || ''}”</div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
            <button class="icon-btn gold" id="playModalPadBtn">
              🎹 ${padPlaying && padKey === (item.louvor?.tomPad || 'G') ? 'Parar Fundo Musical' : `Tocar Fundo de Oração (Tom ${item.louvor?.tomPad || 'G'})`}
            </button>
            ${item.louvor?.youtubeId ? `
              <button class="icon-btn" id="toggleYoutubeEmbedBtn">▶️ Ver Clipe Integrado</button>
            ` : ''}
            <a class="icon-btn" href="${item.louvor?.youtubeUrl || '#'}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
              🔗 Abrir no YouTube ↗
            </a>
          </div>

          <div class="yt-embed-container" id="ytEmbedBox"></div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-top:8px;border-top:1px solid var(--border-color);">
          <div style="display:flex;gap:8px;">
            <button class="mini-btn" id="editCurrentSermonBtn">✏️ Editar Esboço</button>
            <button class="mini-btn" id="printCurrentSermonBtn">🖨️ Imprimir / Salvar PDF</button>
          </div>
          <button class="mini-btn primary" id="openPulpitModeBottomBtn">🎙️ Modo Púlpito</button>
        </div>
      </div>
    `;

    document.getElementById('closeDetailModalBtn')?.addEventListener('click', () => {
      document.getElementById('sermonDetailModal')?.classList.remove('open');
    });

    content.querySelectorAll('[data-set-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        changeSermonStatus(item.id, btn.dataset.setStatus);
      });
    });

    content.querySelectorAll('[data-version]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentVersion = btn.dataset.version;
        compareAllVersions = false;
        renderSermonModalInner(item);
      });
    });

    document.getElementById('toggleCompareVersionsBtn')?.addEventListener('click', () => {
      compareAllVersions = !compareAllVersions;
      renderSermonModalInner(item);
    });

    document.getElementById('playModalPadBtn')?.addEventListener('click', () => {
      toggleWorshipPad(item.louvor?.tomPad || 'G');
      renderSermonModalInner(item);
    });

    document.getElementById('toggleYoutubeEmbedBtn')?.addEventListener('click', () => {
      const box = document.getElementById('ytEmbedBox');
      if (!box) return;
      if (box.classList.contains('open')) {
        box.classList.remove('open');
        box.innerHTML = '';
      } else {
        box.classList.add('open');
        box.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${item.louvor.youtubeId}" title="YouTube player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      }
    });

    document.getElementById('modalAiEnrichBtn')?.addEventListener('click', () => {
      document.getElementById('sermonDetailModal')?.classList.remove('open');
      activeView = 'ia';
      renderAll();
      handleSendAiMessage(
        `Aprofunde e expanda a exposição homilética de ${item.referencia} (${item.titulo}), no tema de ${item.tema}.`,
        item
      );
    });

    document.getElementById('openPulpitModeBtn')?.addEventListener('click', () => openPulpitMode(item));
    document.getElementById('openPulpitModeBottomBtn')?.addEventListener('click', () => openPulpitMode(item));
    document.getElementById('editCurrentSermonBtn')?.addEventListener('click', () => {
      document.getElementById('sermonDetailModal')?.classList.remove('open');
      openEditorModal(item);
    });
    document.getElementById('printCurrentSermonBtn')?.addEventListener('click', () => window.print());
  }

  function openPulpitMode(item) {
    const overlay = document.getElementById('pulpitOverlay');
    const body = document.getElementById('pulpitBody');
    if (!overlay || !body) return;

    body.style.setProperty('--pulpit-scale', `${pulpitFontSize}rem`);
    body.innerHTML = `
      <div style="margin-bottom:20px;">
        <span class="ref-pill" style="font-size:0.9rem;">📖 ${item.referencia} (${currentVersion})</span>
        <h1 style="font-size:1.65em;margin-top:8px;color:#F8FAFC;line-height:1.25;">${item.titulo}</h1>
        <p style="color:#E5B85B;font-weight:600;margin-top:6px;">🎯 ${item.proposicao}</p>
      </div>

      <div style="background:#141C2B;border-left:5px solid #E5B85B;padding:18px;border-radius:0 14px 14px 0;margin-bottom:22px;font-family:Georgia,serif;">
        ${(item.versoes && item.versoes[currentVersion]) || item.versoes?.NVT || ''}
        <div style="margin-top:10px;font-family:sans-serif;font-size:0.8em;color:#94A3B8;">
          🔗 Apoio: ${(item.textosApoio || []).join(' • ')}
        </div>
      </div>

      <div class="pulpit-topic-check" data-pulpit-step="intro">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:800;color:#E5B85B;margin-bottom:6px;">
          <input type="checkbox" class="pulpit-step-cb" style="width:20px;height:20px;">
          <span>INTRODUÇÃO CONTEXTUAL</span>
        </label>
        <p>${item.esboco?.introducao || ''}</p>
      </div>

      ${(item.esboco?.topicos || []).map((t, i) => `
        <div class="pulpit-topic-check" data-pulpit-step="t${i}">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:800;color:#60A5FA;margin-bottom:6px;">
            <input type="checkbox" class="pulpit-step-cb" style="width:20px;height:20px;">
            <span>${t.titulo}</span>
          </label>
          <p style="margin-bottom:10px;">${t.exposicao}</p>
          <div style="background:rgba(229,184,91,0.14);border-left:3px solid #E5B85B;padding:10px 12px;border-radius:0 8px 8px 0;color:#FDE68A;">
            <strong>👉 Aplicação:</strong> ${t.aplicacao}
          </div>
        </div>
      `).join('')}

      <div class="pulpit-topic-check" data-pulpit-step="concl">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:800;color:#4ADE80;margin-bottom:6px;">
          <input type="checkbox" class="pulpit-step-cb" style="width:20px;height:20px;">
          <span>CONCLUSÃO & APELO (${item.louvor?.titulo || 'Louvor Âncora'})</span>
        </label>
        <p style="margin-bottom:10px;"><strong>Conclusão:</strong> ${item.esboco?.conclusao || ''}</p>
        <p style="color:#FDE68A;"><strong>🔥 Apelo:</strong> ${item.esboco?.apelo || ''}</p>
        <p style="margin-top:8px;font-size:0.85em;color:#CBD5E1;">🎵 Louvor Âncora: <strong>${item.louvor?.titulo || ''}</strong> (${item.louvor?.artista || ''}) — “${item.louvor?.trecho || ''}”</p>
      </div>
    `;

    body.querySelectorAll('.pulpit-step-cb').forEach((cb) => {
      cb.addEventListener('change', () => {
        cb.closest('.pulpit-topic-check')?.classList.toggle('done', cb.checked);
      });
    });

    const pulpitPadBtn = document.getElementById('pulpitPadBtn');
    if (pulpitPadBtn) {
      pulpitPadBtn.onclick = () => toggleWorshipPad(item.louvor?.tomPad || 'G');
    }
    updatePadUI();
    overlay.classList.add('open');
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function openEditorModal(itemToEdit) {
    const isEdit = Boolean(itemToEdit);
    const item = itemToEdit || {
      id: 'sermao-' + Date.now(),
      status: 'pronto',
      titulo: '',
      proposicao: '',
      referencia: '',
      livro: '',
      tema: 'Restauração',
      tags: ['Restauração', 'Fé'],
      dataMinistracao: 'Pronto para Ministrar',
      localMinistracao: 'Culto da Família',
      versoes: { NVT: '', NVI: '', NTLH: '', MENSAGEM: '' },
      textosApoio: [],
      louvor: { titulo: '', artista: '', trecho: '', youtubeUrl: '', youtubeId: '', tomPad: 'G' },
      esboco: {
        introducao: '',
        topicos: [
          { titulo: 'I. Primeiro Ponto Expositivo', exposicao: '', aplicacao: '' },
          { titulo: 'II. Segundo Ponto Expositivo', exposicao: '', aplicacao: '' },
          { titulo: 'III. Terceiro Ponto Expositivo', exposicao: '', aplicacao: '' }
        ],
        conclusao: '',
        apelo: ''
      }
    };

    const modal = document.getElementById('editorModal');
    const formContainer = document.getElementById('editorModalContent');
    if (!modal || !formContainer) return;

    const top1 = item.esboco?.topicos?.[0] || { titulo: 'I.', exposicao: '', aplicacao: '' };
    const top2 = item.esboco?.topicos?.[1] || { titulo: 'II.', exposicao: '', aplicacao: '' };
    const top3 = item.esboco?.topicos?.[2] || { titulo: 'III.', exposicao: '', aplicacao: '' };

    formContainer.innerHTML = `
      <div class="modal-header">
        <div>
          <h2 style="font-size:1.15rem;font-weight:800;">${isEdit ? '✏️ Editar Ficha Homilética' : '➕ Novo Esboço / Passagem na Gaveta'}</h2>
          <p style="font-size:0.76rem;color:#CBD5E1;">Escolha a Gaveta Temática e preencha os campos.</p>
        </div>
        <button class="modal-close" id="closeEditorModalBtn">✕</button>
      </div>
      <form id="sermonForm" class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Título da Mensagem *</label>
            <input type="text" id="fTitulo" required value="${(item.titulo || '').replace(/"/g, '&quot;')}" placeholder="Ex: Deserto: A Pedagogia de Deus">
          </div>
          <div class="form-group">
            <label>Referência Bíblica Principal *</label>
            <input type="text" id="fReferencia" required value="${(item.referencia || '').replace(/"/g, '&quot;')}" placeholder="Ex: Êxodo 13:17-18">
          </div>
          <div class="form-group">
            <label>Livro Bíblico</label>
            <input type="text" id="fLivro" value="${(item.livro || '').replace(/"/g, '&quot;')}" placeholder="Ex: Êxodo">
          </div>
          <div class="form-group">
            <label>Lista / Status</label>
            <select id="fStatus">
              <option value="pregada" ${item.status === 'pregada' ? 'selected' : ''}>1. Exposição Pregada (Concluído)</option>
              <option value="pronto" ${item.status === 'pronto' ? 'selected' : ''}>2. Esboço Pronto (Pronto para Pregar)</option>
              <option value="acervo" ${item.status === 'acervo' ? 'selected' : ''}>3. Em Acervo (Banco de Ideias)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Gaveta Temática Principal</label>
            <select id="fTema">
              ${THEME_DRAWERS_META.map((t) => `<option value="${t.id}" ${item.tema === t.id ? 'selected' : ''}>${t.icon} ${t.id}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Data / Status de Agenda</label>
            <input type="text" id="fData" value="${(item.dataMinistracao || '').replace(/"/g, '&quot;')}" placeholder="Ex: 2026-11-08 ou Pronto para Ministrar">
          </div>
          <div class="form-group full">
            <label>Proposição Homilética Central</label>
            <input type="text" id="fProposicao" value="${(item.proposicao || '').replace(/"/g, '&quot;')}" placeholder="A ideia central da mensagem em uma frase clara">
          </div>
          <div class="form-group full">
            <label>Texto Bíblico Base (NVT) *</label>
            <textarea id="fNVT" rows="3" required>${item.versoes?.NVT || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Textos de Apoio (separados por vírgula)</label>
            <input type="text" id="fApoio" value="${(item.textosApoio || []).join(', ')}" placeholder="Ex: Romanos 8:28, Salmos 23:1">
          </div>
          <div class="form-group">
            <label>Tags / Palavras-chave (separadas por vírgula)</label>
            <input type="text" id="fTags" value="${(item.tags || []).join(', ')}" placeholder="Ex: Fé, Deserto, Provisão">
          </div>
          <div class="form-group">
            <label>Louvor Âncora (Título da Canção)</label>
            <input type="text" id="fLouvorTitulo" value="${(item.louvor?.titulo || '').replace(/"/g, '&quot;')}" placeholder="Ex: Deserto">
          </div>
          <div class="form-group">
            <label>Artista / Ministério & Tom do Pad</label>
            <div style="display:flex;gap:6px;">
              <input type="text" id="fLouvorArtista" style="flex:1;" value="${(item.louvor?.artista || '').replace(/"/g, '&quot;')}" placeholder="Ex: Maria Marçal">
              <select id="fLouvorTom" style="width:80px;">
                ${['C', 'D', 'E', 'F', 'G', 'A'].map((k) => `<option value="${k}" ${(item.louvor?.tomPad || 'G') === k ? 'selected' : ''}>Tom ${k}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group full">
            <label>Trecho da Letra (Conexão com o Apelo)</label>
            <input type="text" id="fLouvorTrecho" value="${(item.louvor?.trecho || '').replace(/"/g, '&quot;')}">
          </div>
          <div class="form-group full">
            <label>Introdução & Contexto Histórico</label>
            <textarea id="fIntro" rows="2">${item.esboco?.introducao || ''}</textarea>
          </div>
          <div class="form-group full">
            <label>Tópico I (Título, Exposição e Aplicação)</label>
            <input type="text" id="fT1Titulo" value="${(top1.titulo || '').replace(/"/g, '&quot;')}" style="margin-bottom:4px;">
            <textarea id="fT1Exp" rows="2" placeholder="Exposição bíblica do tópico I">${top1.exposicao || ''}</textarea>
            <input type="text" id="fT1App" value="${(top1.aplicacao || '').replace(/"/g, '&quot;')}" placeholder="Aplicação prática do tópico I" style="margin-top:4px;">
          </div>
          <div class="form-group full">
            <label>Tópico II (Título, Exposição e Aplicação)</label>
            <input type="text" id="fT2Titulo" value="${(top2.titulo || '').replace(/"/g, '&quot;')}" style="margin-bottom:4px;">
            <textarea id="fT2Exp" rows="2" placeholder="Exposição bíblica do tópico II">${top2.exposicao || ''}</textarea>
            <input type="text" id="fT2App" value="${(top2.aplicacao || '').replace(/"/g, '&quot;')}" placeholder="Aplicação prática do tópico II" style="margin-top:4px;">
          </div>
          <div class="form-group full">
            <label>Tópico III (Título, Exposição e Aplicação)</label>
            <input type="text" id="fT3Titulo" value="${(top3.titulo || '').replace(/"/g, '&quot;')}" style="margin-bottom:4px;">
            <textarea id="fT3Exp" rows="2" placeholder="Exposição bíblica do tópico III">${top3.exposicao || ''}</textarea>
            <input type="text" id="fT3App" value="${(top3.aplicacao || '').replace(/"/g, '&quot;')}" placeholder="Aplicação prática do tópico III" style="margin-top:4px;">
          </div>
          <div class="form-group">
            <label>Conclusão</label>
            <textarea id="fConclusao" rows="2">${item.esboco?.conclusao || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Apelo Pastoral</label>
            <textarea id="fApelo" rows="2">${item.esboco?.apelo || ''}</textarea>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px;">
          <button type="button" class="mini-btn" id="cancelEditorBtn">Cancelar</button>
          <button type="submit" class="icon-btn gold">💾 Salvar na Gaveta</button>
        </div>
      </form>
    `;

    const closeEditor = () => modal.classList.remove('open');
    document.getElementById('closeEditorModalBtn')?.addEventListener('click', closeEditor);
    document.getElementById('cancelEditorBtn')?.addEventListener('click', closeEditor);

    document.getElementById('sermonForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nvtVal = document.getElementById('fNVT').value.trim();
      const updated = {
        ...item,
        titulo: document.getElementById('fTitulo').value.trim(),
        referencia: document.getElementById('fReferencia').value.trim(),
        livro: document.getElementById('fLivro').value.trim() || 'Bíblia',
        status: document.getElementById('fStatus').value,
        tema: document.getElementById('fTema').value,
        dataMinistracao: document.getElementById('fData').value.trim(),
        proposicao: document.getElementById('fProposicao').value.trim(),
        versoes: {
          NVT: nvtVal,
          NVI: item.versoes?.NVI || nvtVal,
          NTLH: item.versoes?.NTLH || nvtVal,
          MENSAGEM: item.versoes?.MENSAGEM || nvtVal
        },
        textosApoio: document.getElementById('fApoio').value.split(',').map((s) => s.trim()).filter(Boolean),
        tags: document.getElementById('fTags').value.split(',').map((s) => s.trim()).filter(Boolean),
        louvor: {
          ...item.louvor,
          titulo: document.getElementById('fLouvorTitulo').value.trim() || 'Louvor de Ministração',
          artista: document.getElementById('fLouvorArtista').value.trim() || 'Adoração',
          tomPad: document.getElementById('fLouvorTom').value,
          trecho: document.getElementById('fLouvorTrecho').value.trim()
        },
        esboco: {
          introducao: document.getElementById('fIntro').value.trim(),
          topicos: [
            {
              titulo: document.getElementById('fT1Titulo').value.trim(),
              exposicao: document.getElementById('fT1Exp').value.trim(),
              aplicacao: document.getElementById('fT1App').value.trim()
            },
            {
              titulo: document.getElementById('fT2Titulo').value.trim(),
              exposicao: document.getElementById('fT2Exp').value.trim(),
              aplicacao: document.getElementById('fT2App').value.trim()
            },
            {
              titulo: document.getElementById('fT3Titulo').value.trim(),
              exposicao: document.getElementById('fT3Exp').value.trim(),
              aplicacao: document.getElementById('fT3App').value.trim()
            }
          ],
          conclusao: document.getElementById('fConclusao').value.trim(),
          apelo: document.getElementById('fApelo').value.trim()
        }
      };

      const existingIdx = acervo.findIndex((x) => x.id === updated.id);
      if (existingIdx >= 0) {
        acervo[existingIdx] = updated;
      } else {
        acervo.unshift(updated);
      }

      activeView = `theme:${updated.tema}`;
      saveData();
      closeEditor();
      renderAll();
      openSermonModal(updated.id);
    });

    modal.classList.add('open');
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(acervo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acervo-homiletico-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderAll() {
    updateKPIs();
    renderDrawerHandles();
    renderMainContent();
    updatePadUI();
  }

  function initEvents() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        if (clearBtn) clearBtn.style.display = searchQuery ? 'block' : 'none';
        renderMainContent();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchQuery = '';
        if (searchInput) searchInput.value = '';
        clearBtn.style.display = 'none';
        renderMainContent();
      });
    }

    document.getElementById('homeCleanBtn')?.addEventListener('click', () => {
      activeView = 'clean';
      renderAll();
    });

    document.querySelectorAll('[data-status-drawer]').forEach((el) => {
      el.addEventListener('click', () => {
        const st = el.dataset.statusDrawer;
        if (st === 'clean') {
          activeView = 'clean';
        } else {
          const target = `status:${st}`;
          activeView = (activeView === target) ? 'clean' : target;
        }
        renderAll();
      });
    });

    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nav = btn.dataset.nav;
        if (nav === 'clean') {
          activeView = 'clean';
        } else if (nav === 'ia') {
          activeView = (activeView === 'ia') ? 'clean' : 'ia';
        } else {
          const target = `status:${nav}`;
          activeView = (activeView === target) ? 'clean' : target;
        }
        renderAll();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    document.getElementById('openAiHeaderBtn')?.addEventListener('click', () => {
      activeView = (activeView === 'ia') ? 'clean' : 'ia';
      renderAll();
    });
    document.getElementById('newSermonBtn')?.addEventListener('click', () => openEditorModal(null));
    document.getElementById('exportJsonBtn')?.addEventListener('click', exportJSON);
    document.getElementById('resetDataBtn')?.addEventListener('click', resetToDefaultData);

    const darkBtn = document.getElementById('toggleDarkBtn');
    if (localStorage.getItem(THEME_KEY) === 'dark') {
      document.body.classList.add('dark-mode');
    }
    darkBtn?.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem(THEME_KEY, document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    document.getElementById('toggleMobileFrameBtn')?.addEventListener('click', () => {
      document.body.classList.toggle('mobile-frame-active');
    });

    document.getElementById('padToggleBtn')?.addEventListener('click', () => toggleWorshipPad());
    document.querySelectorAll('.key-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        padKey = btn.dataset.key;
        if (padPlaying) {
          startWorshipPad(padKey);
        } else {
          updatePadUI();
        }
      });
    });

    document.getElementById('closePulpitBtn')?.addEventListener('click', () => {
      document.getElementById('pulpitOverlay')?.classList.remove('open');
    });
    document.getElementById('pulpitFontUp')?.addEventListener('click', () => {
      pulpitFontSize = Math.min(1.8, +(pulpitFontSize + 0.1).toFixed(2));
      document.getElementById('pulpitBody')?.style.setProperty('--pulpit-scale', `${pulpitFontSize}rem`);
    });
    document.getElementById('pulpitFontDown')?.addEventListener('click', () => {
      pulpitFontSize = Math.max(0.85, +(pulpitFontSize - 0.1).toFixed(2));
      document.getElementById('pulpitBody')?.style.setProperty('--pulpit-scale', `${pulpitFontSize}rem`);
    });
    document.getElementById('pulpitTimerToggle')?.addEventListener('click', (e) => {
      if (pulpitTimerInterval) {
        clearInterval(pulpitTimerInterval);
        pulpitTimerInterval = null;
        e.target.textContent = '▶ Iniciar';
      } else {
        pulpitTimerInterval = setInterval(() => {
          pulpitSeconds++;
          const clock = document.getElementById('pulpitClock');
          if (clock) clock.textContent = formatTime(pulpitSeconds);
        }, 1000);
        e.target.textContent = '⏸ Pausar';
      }
    });
    document.getElementById('pulpitTimerReset')?.addEventListener('click', () => {
      clearInterval(pulpitTimerInterval);
      pulpitTimerInterval = null;
      pulpitSeconds = 0;
      const clock = document.getElementById('pulpitClock');
      if (clock) clock.textContent = '00:00';
      const btn = document.getElementById('pulpitTimerToggle');
      if (btn) btn.textContent = '▶ Iniciar';
    });

    document.querySelectorAll('.modal-backdrop').forEach((bd) => {
      bd.addEventListener('click', (e) => {
        if (e.target === bd) bd.classList.remove('open');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initEvents();
    renderAll();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  });
})();
