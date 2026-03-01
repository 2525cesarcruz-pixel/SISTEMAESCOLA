// ══════════════════════════════════════════════════════════════════
// PADRÃO MUNICIPAL — Layout institucional único (cabeçalho/rodapé)
// E.M. Getúlio Vargas — Nova Ubiratã/MT
// Uso: renderInstitucionalLayout({ titulo, orientacao }), preparePrint()
// ══════════════════════════════════════════════════════════════════
(function () {
  if (window.InstitucionalLayout && typeof window.InstitucionalLayout.render === 'function') return;

  const SUBTITULO_FIXO = 'E.M. Getúlio Vargas — Nova Ubiratã/MT';
  const EMAIL_FIXO = 'E-mail: em.getuliovargas@novaubirata.edu.mt.gov.br';
  const RODAPE_FIXO = 'Distrito de Novo Mato Grosso, Nova Ubiratã - Mato Grosso';
  const base = (typeof document !== 'undefined' && document.baseURI) ? new URL('.', document.baseURI).href : '';
  const LOGO_ESQUERDA = base + 'assets/logo_escola.png';
  const LOGO_DIREITA = base + 'assets/logo_prefeitura.png';

  /**
   * Renderiza o cabeçalho institucional no elemento dado.
   * @param {HTMLElement} container - Elemento que receberá o cabeçalho (ex.: document.getElementById('doc-header'))
   * @param {Object} opts - { titulo: string }
   */
  function renderHeader(container, opts) {
    if (!container) return;
    const titulo = (opts && opts.titulo) ? String(opts.titulo) : 'Documento Oficial';

    const wrap = document.createElement('div');
    wrap.className = 'doc-header';

    const wrapEsq = document.createElement('div');
    wrapEsq.className = 'doc-logo-wrap';
    const imgEsq = document.createElement('img');
    imgEsq.className = 'doc-logo-esquerda';
    imgEsq.src = LOGO_ESQUERDA;
    imgEsq.alt = 'Logo Escola';
    imgEsq.onerror = function () { this.style.display = 'none'; };
    wrapEsq.appendChild(imgEsq);

    const centro = document.createElement('div');
    centro.className = 'doc-centro';
    const h = document.createElement('div');
    h.className = 'doc-titulo';
    h.textContent = titulo;
    const sub = document.createElement('div');
    sub.className = 'doc-subtitulo';
    sub.textContent = SUBTITULO_FIXO;
    const email = document.createElement('div');
    email.className = 'doc-email';
    email.textContent = EMAIL_FIXO;
    centro.appendChild(h);
    centro.appendChild(sub);
    centro.appendChild(email);

    const wrapDir = document.createElement('div');
    wrapDir.className = 'doc-logo-wrap';
    const imgDir = document.createElement('img');
    imgDir.className = 'doc-logo-direita';
    imgDir.src = LOGO_DIREITA;
    imgDir.alt = 'Logo Prefeitura';
    imgDir.onerror = function () { this.style.display = 'none'; };
    wrapDir.appendChild(imgDir);

    wrap.appendChild(wrapEsq);
    wrap.appendChild(centro);
    wrap.appendChild(wrapDir);
    container.textContent = '';
    container.appendChild(wrap);
  }

  /**
   * Renderiza o rodapé institucional no elemento dado.
   * @param {HTMLElement} container
   */
  function renderFooter(container) {
    if (!container) return;
    const wrap = document.createElement('div');
    wrap.className = 'doc-footer';
    wrap.textContent = RODAPE_FIXO;
    container.textContent = '';
    container.appendChild(wrap);
  }

  /**
   * Monta layout completo do documento (cabeçalho + área body + rodapé).
   * Cria ou usa #doc e preenche #doc-header e #doc-footer; o conteúdo vai em #doc-body.
   * Usa prepend/appendChild para evitar insertBefore com referências frágeis após re-render.
   * @param {Object} opts - { titulo: string, orientacao?: 'portrait' | 'landscape' }
   * @returns { { doc: HTMLElement, header: HTMLElement, body: HTMLElement, footer: HTMLElement } }
   */
  function renderInstitucionalLayout(opts) {
    const titulo = (opts && opts.titulo) ? String(opts.titulo) : 'Documento Oficial';
    const orientacao = (opts && opts.orientacao) ? String(opts.orientacao) : 'portrait';

    let doc = document.getElementById('doc');
    if (!doc) {
      doc = document.createElement('div');
      doc.id = 'doc';
      doc.className = 'doc doc--' + (orientacao === 'landscape' ? 'landscape' : 'portrait');
      const parent = document.querySelector('.conteudo') || document.querySelector('main') || document.body;
      parent.appendChild(doc);
    } else {
      doc.className = 'doc doc--' + (orientacao === 'landscape' ? 'landscape' : 'portrait');
    }

    // Preservar conteúdo do body antes de reconstruir (evita perda em re-render)
    const oldBody = document.getElementById('doc-body');
    const bodyContent = oldBody ? oldBody.innerHTML : '';

    // Remover todos os filhos do doc (evita referências órfãs e insertBefore frágil)
    while (doc.firstChild) doc.removeChild(doc.firstChild);

    // Criar novos elementos (sempre frescos, sem referências órfãs)
    const header = document.createElement('div');
    header.id = 'doc-header';
    renderHeader(header, { titulo: titulo });

    const contentWrapper = document.createElement('div');
    contentWrapper.id = 'doc-content';
    const body = document.createElement('div');
    body.id = 'doc-body';
    body.className = 'doc-body';
    if (bodyContent) body.innerHTML = bodyContent;
    contentWrapper.appendChild(body);

    const footer = document.createElement('div');
    footer.id = 'doc-footer';
    renderFooter(footer);

    // Inserir na ordem correta sem insertBefore (prepend/appendChild são seguros)
    doc.prepend(header);
    doc.appendChild(contentWrapper);
    doc.appendChild(footer);

    return { doc: doc, header: header, body: body, footer: footer };
  }

  /**
   * Prepara a página para impressão: adiciona classe ao body e chama window.print().
   * Deve ser chamado quando o usuário clicar em "Imprimir" ou "Reimprimir".
   */
  function preparePrint() {
    document.body.classList.add('print-doc-only');
    window.print();
    document.body.classList.remove('print-doc-only');
  }

  window.InstitucionalLayout = {
    render: renderInstitucionalLayout,
    renderHeader,
    renderFooter,
    preparePrint,
    SUBTITULO_FIXO,
    EMAIL_FIXO,
    RODAPE_FIXO,
    LOGO_ESQUERDA,
    LOGO_DIREITA
  };
})();
