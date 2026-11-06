const PASTA_ID = '173njkPfKx782MJ-l0eJ53_LvOYBKZuby';

const NOME_ARQUIVO = 'estado.json';
const NOME_PASTA_BACKUPS = 'Backups';
const CHAVE_ARQUIVO_ESTADO_ID = 'ARQUIVO_ESTADO_ID';

// 24 horas em milissegundos
const INTERVALO_BACKUP_AUTOMATICO_MS =
  24 * 60 * 60 * 1000;

// =========================================================
// USUÁRIOS E AUTENTICAÇÃO
// =========================================================

const NOME_ARQUIVO_USUARIOS = 'usuarios.json';
const NOME_ARQUIVO_AUDITORIA = 'auditoria.json';

const CHAVE_ARQUIVO_USUARIOS_ID =
  'ARQUIVO_USUARIOS_ID';
const CHAVE_ARQUIVO_AUDITORIA_ID = 'ARQUIVO_AUDITORIA_ID';
const NOME_ARQUIVO_ESCALA_PUBLICADA = 'escala_publicada.json';
const CHAVE_ARQUIVO_ESCALA_PUBLICADA_ID = 'ARQUIVO_ESCALA_PUBLICADA_ID';
const NOME_ARQUIVO_ESCALAS_EVENTUAIS = 'escalas_eventuais.json';
const CHAVE_ARQUIVO_ESCALAS_EVENTUAIS_ID = 'ARQUIVO_ESCALAS_EVENTUAIS_ID';
const NOME_ARQUIVO_EVENTUAIS_INDICE = 'eventuais_indice.json';
const CHAVE_ARQUIVO_EVENTUAIS_INDICE_ID = 'ARQUIVO_EVENTUAIS_INDICE_ID';
const PREFIXO_ARQUIVO_EVENTUAIS_ANO_ID = 'ARQUIVO_EVENTUAIS_ANO_';



const PREFIXO_SESSAO =
  'SESSAO_USUARIO_';

// Sessão válida por 8 horas.
const DURACAO_SESSAO_MS =
  8 * 60 * 60 * 1000;
const CHAVE_PEPPER_SENHAS = 'PEPPER_SENHAS_CCI';
const PREFIXO_TENTATIVA_LOGIN = 'LOGIN_CCI_';
const MAX_TENTATIVAS_LOGIN = 5;
const BLOQUEIO_LOGIN_SEGUNDOS = 15 * 60;
const ITERACOES_HASH_SENHA = 4000;


// =========================================================
// PASTA PRINCIPAL
// =========================================================

function obterPasta_() {

  return DriveApp.getFolderById(PASTA_ID);
}

function obterArquivoAuditoria_() {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty(CHAVE_ARQUIVO_AUDITORIA_ID);
  if (id) {
    try {
      const arquivo = DriveApp.getFileById(id);
      if (!arquivo.isTrashed() && arquivo.getName() === NOME_ARQUIVO_AUDITORIA) return arquivo;
    } catch (erro) {
      console.warn('Arquivo de auditoria registrado não foi encontrado:', erro);
    }
  }
  const arquivos = obterPasta_().getFilesByName(NOME_ARQUIVO_AUDITORIA);
  const arquivo = arquivos.hasNext()
    ? arquivos.next()
    : obterPasta_().createFile(NOME_ARQUIVO_AUDITORIA, JSON.stringify({ registros: [] }, null, 2), MimeType.PLAIN_TEXT);
  propriedades.setProperty(CHAVE_ARQUIVO_AUDITORIA_ID, arquivo.getId());
  return arquivo;
}

function registrarAuditoria_(usuario, acao, detalhes) {
  const arquivo = obterArquivoAuditoria_();
  let dados;
  try {
    dados = JSON.parse(arquivo.getBlob().getDataAsString('UTF-8'));
  } catch (erro) {
    dados = { registros: [] };
  }
  if (!Array.isArray(dados.registros)) dados.registros = [];
  dados.registros.push({
    id: Utilities.getUuid(),
    dataHora: new Date().toISOString(),
    usuario: usuarioPublico_(usuario),
    acao: acao,
    detalhes: detalhes || {}
  });
  arquivo.setContent(JSON.stringify(dados, null, 2));
}

function listarAuditoria(token, limite) {
  exigirPerfil_(token, ['administrador']);
  const arquivo = obterArquivoAuditoria_();
  const dados = JSON.parse(arquivo.getBlob().getDataAsString('UTF-8'));
  const quantidade = Math.min(Math.max(Number(limite) || 100, 1), 500);
  return { sucesso: true, registros: (dados.registros || []).slice(-quantidade).reverse() };
}


// =========================================================
// ARQUIVO PRINCIPAL estado.json
// =========================================================

function obterArquivoEstado_() {

  const propriedades =
    PropertiesService.getScriptProperties();

  const arquivoId =
    propriedades.getProperty(
      CHAVE_ARQUIVO_ESTADO_ID
    );


  // =====================================================
  // 1. TENTA ABRIR DIRETAMENTE PELO ID SALVO
  // =====================================================

  if (arquivoId) {

    try {

      const arquivo =
        DriveApp.getFileById(arquivoId);

      // Confirma que o arquivo ainda e o estado.json.
      if (
        arquivo &&
        !arquivo.isTrashed() &&
        arquivo.getName() === NOME_ARQUIVO
      ) {

        return arquivo;
      }

    } catch (erro) {

      console.warn(
        'ID salvo do estado.json nao e mais valido:',
        erro
      );
    }
  }


  // =====================================================
  // 2. FALLBACK: PROCURA PELO NOME NA PASTA PRINCIPAL
  // =====================================================

  const pasta =
    obterPasta_();

  const arquivos =
    pasta.getFilesByName(
      NOME_ARQUIVO
    );

  if (!arquivos.hasNext()) {

    return null;
  }

  const arquivo =
    arquivos.next();


  // =====================================================
  // 3. GUARDA O ID PARA AS PROXIMAS CONSULTAS
  // =====================================================

  propriedades.setProperty(
    CHAVE_ARQUIVO_ESTADO_ID,
    arquivo.getId()
  );

  return arquivo;
}


// =========================================================
// ESTADO INICIAL
// =========================================================

function criarEstadoInicial_() {

  return {

    versao: 1,

    atualizadoEm:
      new Date().toISOString(),

    estado: {

      funcoes: [],

      militares: [],

      vagas: {},

      indisponibilidades: [],

      indisponibilidadesSemana: [],

      diasEspeciais: {},

      escala: {},

      escalas: {}
    }
  };
}


// =========================================================
// INICIALIZAÇÃO DO BANCO
// =========================================================

function inicializarBanco_() {

  const arquivoExistente =
    obterArquivoEstado_();

  if (arquivoExistente) {

    return 'O arquivo estado.json já existe.';
  }

  const dados =
    criarEstadoInicial_();

  const arquivo =
    obterPasta_().createFile(

      NOME_ARQUIVO,

      JSON.stringify(
        dados,
        null,
        2
      ),

      MimeType.PLAIN_TEXT
    );

  PropertiesService
    .getScriptProperties()
    .setProperty(
      CHAVE_ARQUIVO_ESTADO_ID,
      arquivo.getId()
    );

  return 'estado.json criado com sucesso.';
}


// =========================================================
// CARREGAR DADOS
// =========================================================

function carregarDados(token) {

  exigirPerfil_(
    token,
    [
      'administrador',
      'editor',
      'visualizador'
    ]
  );

  const arquivo =
    obterArquivoEstado_();


  if (!arquivo) {

    throw new Error(
      'Arquivo estado.json não encontrado. ' +
      'O sistema não criou um novo banco automaticamente ' +
      'para evitar perda ou substituição acidental dos dados.'
    );
  }


  const conteudo =
    arquivo
      .getBlob()
      .getDataAsString('UTF-8');


  let dados;


  try {

    dados =
      JSON.parse(conteudo);

  } catch (erro) {

    throw new Error(
      'O arquivo estado.json contém um JSON inválido.'
    );
  }


  if (
    !dados ||
    typeof dados !== 'object' ||
    !dados.estado ||
    typeof dados.estado !== 'object' ||
    !Number.isFinite(Number(dados.versao))
  ) {

    throw new Error(
      'A estrutura do arquivo estado.json é inválida.'
    );
  }


  return dados;
}


// =========================================================
// SALVAR DADOS
// =========================================================

function salvarDados(
  novoEstado,
  versaoCliente,
  token,
  contextoOperacao
) {

  const usuarioOperacao = exigirPerfil_(
    token,
    [
      'administrador',
      'editor'
    ]
  );

  const lock =
    LockService.getScriptLock();

  // Aguarda até 10 segundos pelo bloqueio.
  lock.waitLock(10000);

  try {

    const arquivo =
      obterArquivoEstado_();

    if (!arquivo) {

      throw new Error(
        'Arquivo estado.json não encontrado.'
      );
    }


    // -----------------------------------------------------
    // LÊ O ESTADO ATUAL
    // -----------------------------------------------------

    const conteudo =
      arquivo
        .getBlob()
        .getDataAsString('UTF-8');

    const atual =
      JSON.parse(conteudo);


    // -----------------------------------------------------
    // VERIFICA CONFLITO DE VERSÃO
    // -----------------------------------------------------

    if (
      Number(versaoCliente) !==
      Number(atual.versao)
    ) {

      return {

        sucesso: false,

        conflito: true,

        mensagem:
          'Os dados foram alterados por outro usuário.',

        versaoAtual:
          atual.versao
      };
    }


    // -----------------------------------------------------
    // BACKUP AUTOMÁTICO
    //
    // O backup contém a versão ANTERIOR,
    // antes de ela ser substituída.
    //
    // No máximo um backup automático
    // a cada período de 24 horas.
    // -----------------------------------------------------

    if (
      deveCriarBackupAutomatico_()
    ) {

      criarBackupEstado_(
        conteudo,
        atual.versao,
        'automatico'
      );

      registrarBackupAutomatico_();
    }


    // -----------------------------------------------------
    // CRIA NOVA VERSÃO
    // -----------------------------------------------------

    const novaVersao =
      Number(atual.versao) + 1;

    const novosDados = {

      versao:
        novaVersao,

      atualizadoEm:
        new Date().toISOString(),

      estado:
        novoEstado
    };


    // -----------------------------------------------------
    // GRAVA NO estado.json
    // -----------------------------------------------------

    arquivo.setContent(

      JSON.stringify(
        novosDados,
        null,
        2
      )
    );

    const camposAlterados = Object.keys(novoEstado || {}).filter(function(chave) {
      return JSON.stringify(atual.estado && atual.estado[chave]) !== JSON.stringify(novoEstado[chave]);
    });
    registrarAuditoria_(usuarioOperacao, 'salvar_estado', {
      versaoAnterior: Number(atual.versao),
      versaoNova: novaVersao,
      camposAlterados: camposAlterados
    });

    if (
      contextoOperacao &&
      contextoOperacao.acao === 'limpar_escala'
    ) {
      const escalasAnteriores = atual.estado && atual.estado.escalas || {};
      const escalasNovas = novoEstado && novoEstado.escalas || {};
      const mesesRemovidos = Object.keys(escalasAnteriores)
        .filter(function(mesAno) {
          return !Object.prototype.hasOwnProperty.call(escalasNovas, mesAno);
        })
        .sort();

      if (mesesRemovidos.length > 0) {
        const mesSolicitado = String(contextoOperacao.mesAno || '');
        registrarAuditoria_(usuarioOperacao, 'limpar_escala', {
          mesAno: mesesRemovidos.indexOf(mesSolicitado) !== -1
            ? mesSolicitado
            : mesesRemovidos[0],
          mesesRemovidos: mesesRemovidos,
          versaoAnterior: Number(atual.versao),
          versaoNova: novaVersao
        });
      }
    }


    // -----------------------------------------------------
    // RETORNA RESULTADO AO INDEX.HTML
    // -----------------------------------------------------

    return {

      sucesso: true,

      conflito: false,

      versao:
        novaVersao,

      atualizadoEm:
        novosDados.atualizadoEm
    };

  } finally {

    lock.releaseLock();
  }
}


// =========================================================
// PASTA DE BACKUPS
// =========================================================

function obterPastaBackups_() {

  const pastaPrincipal =
    obterPasta_();

  const pastas =
    pastaPrincipal
      .getFoldersByName(
        NOME_PASTA_BACKUPS
      );

  if (pastas.hasNext()) {

    return pastas.next();
  }

  return pastaPrincipal.createFolder(
    NOME_PASTA_BACKUPS
  );
}


// =========================================================
// CRIAR ARQUIVO DE BACKUP
// =========================================================

function criarBackupEstado_(
  conteudoAtual,
  versaoAtual,
  tipo = 'automatico'
) {

  const pastaBackups =
    obterPastaBackups_();

  const agora =
    new Date();

  const dataHora =
    Utilities.formatDate(

      agora,

      Session.getScriptTimeZone(),

      'yyyy-MM-dd_HH-mm-ss'
    );


  let prefixo = 'automatico';

  if (tipo === 'manual') {
    prefixo = 'manual';
  }

  if (tipo === 'pre_restauracao') {
    prefixo = 'pre_restauracao';
  }


  const nomeArquivo =
    `backup_${prefixo}_v${versaoAtual}_${dataHora}.json`;


  const arquivo =
    pastaBackups.createFile(

      nomeArquivo,

      conteudoAtual,

      MimeType.PLAIN_TEXT
    );


  return arquivo.getId();
}


// =========================================================
// CONTROLE DO BACKUP AUTOMÁTICO
// =========================================================

function deveCriarBackupAutomatico_() {

  const propriedades =
    PropertiesService
      .getScriptProperties();


  const ultimoBackup =
    propriedades.getProperty(
      'ULTIMO_BACKUP_AUTOMATICO'
    );


  // Nunca foi realizado backup automático.
  if (!ultimoBackup) {

    return true;
  }


  const ultimoBackupNumero =
    Number(ultimoBackup);


  // Proteção contra valor inválido na propriedade.
  if (
    !Number.isFinite(
      ultimoBackupNumero
    )
  ) {

    return true;
  }


  const tempoDecorrido =
    Date.now() -
    ultimoBackupNumero;


  return (
    tempoDecorrido >=
    INTERVALO_BACKUP_AUTOMATICO_MS
  );
}


// =========================================================
// REGISTRAR HORÁRIO DO BACKUP AUTOMÁTICO
// =========================================================

function registrarBackupAutomatico_() {

  PropertiesService
    .getScriptProperties()
    .setProperty(

      'ULTIMO_BACKUP_AUTOMATICO',

      String(Date.now())
    );
}


// =========================================================
// BACKUP MANUAL
// =========================================================

function criarBackupManual(token) {

  const usuarioOperacao = exigirPerfil_(
    token,
    ['administrador']
  );

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const arquivo =
      obterArquivoEstado_();

    if (!arquivo) {

      throw new Error(
        'Arquivo estado.json não encontrado.'
      );
    }


    const conteudo =
      arquivo
        .getBlob()
        .getDataAsString('UTF-8');


    const dados =
      JSON.parse(conteudo);


    const arquivoId =
      criarBackupEstado_(

        conteudo,

        dados.versao,

        'manual'
      );

    registrarAuditoria_(usuarioOperacao, 'criar_backup_manual', {
      versao: Number(dados.versao), arquivoId: arquivoId
    });


    return {

      sucesso: true,

      versao:
        dados.versao,

      arquivoId:
        arquivoId
    };

  } finally {

    lock.releaseLock();
  }
}


// =========================================================
// ESCALA PÚBLICA
// =========================================================

function obterArquivoEscalaPublicada_(criarSeNaoExistir) {
  const propriedades = PropertiesService.getScriptProperties();
  const id = propriedades.getProperty(CHAVE_ARQUIVO_ESCALA_PUBLICADA_ID);
  if (id) {
    try {
      const arquivo = DriveApp.getFileById(id);
      if (!arquivo.isTrashed() && arquivo.getName() === NOME_ARQUIVO_ESCALA_PUBLICADA) return arquivo;
    } catch (erro) {
      console.warn('Arquivo de escala publicada registrado não foi encontrado:', erro);
    }
  }
  const arquivos = obterPasta_().getFilesByName(NOME_ARQUIVO_ESCALA_PUBLICADA);
  if (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    propriedades.setProperty(CHAVE_ARQUIVO_ESCALA_PUBLICADA_ID, arquivo.getId());
    return arquivo;
  }
  if (!criarSeNaoExistir) return null;
  const arquivo = obterPasta_().createFile(
    NOME_ARQUIVO_ESCALA_PUBLICADA,
    JSON.stringify({ publicada: false }, null, 2),
    MimeType.PLAIN_TEXT
  );
  propriedades.setProperty(CHAVE_ARQUIVO_ESCALA_PUBLICADA_ID, arquivo.getId());
  return arquivo;
}

function validarPublicacaoEscala_(publicacao) {
  if (!publicacao || typeof publicacao !== 'object') throw new Error('Dados da publicação inválidos.');
  if (!/^\d{4}-\d{2}$/.test(String(publicacao.mesAno || ''))) throw new Error('Mês da publicação inválido.');
  if (!publicacao.estrutura || !Array.isArray(publicacao.estrutura.funcoes) || typeof publicacao.estrutura.vagas !== 'object') {
    throw new Error('Estrutura da escala publicada inválida.');
  }
  if (!publicacao.dados || typeof publicacao.dados !== 'object') throw new Error('Escala publicada sem dados.');
}

function normalizarColecaoEscalasPublicadas_(dados) {
  if (!dados || typeof dados !== 'object') {
    return { versao: 2, escalas: {} };
  }

  // Migração automática do formato antigo, que guardava apenas uma escala.
  if (dados.publicada === true && /^\d{4}-\d{2}$/.test(String(dados.mesAno || ''))) {
    const mesAnoAntigo = String(dados.mesAno);
    return {
      versao: 2,
      escalas: {
        [mesAnoAntigo]: dados
      }
    };
  }

  if (!dados.escalas || typeof dados.escalas !== 'object') {
    dados.escalas = {};
  }
  dados.versao = 2;
  return dados;
}

function lerColecaoEscalasPublicadas_() {
  const arquivo = obterArquivoEscalaPublicada_(false);
  if (!arquivo) return { versao: 2, escalas: {} };

  try {
    const dados = JSON.parse(arquivo.getBlob().getDataAsString('UTF-8'));
    return normalizarColecaoEscalasPublicadas_(dados);
  } catch (erro) {
    throw new Error('O arquivo de escalas publicadas está com formato inválido.');
  }
}

function publicarEscala(publicacao, token) {
  const usuario = exigirPerfil_(token, ['administrador', 'editor']);
  validarPublicacaoEscala_(publicacao);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const publicadoEm = new Date().toISOString();
    const conteudo = {
      publicada: true,
      publicadoEm: publicadoEm,
      mesAno: String(publicacao.mesAno),
      titulo: String(publicacao.titulo || 'Escala de Serviço - Célula Contraincêndio'),
      estrutura: publicacao.estrutura,
      diasVermelhos: Array.isArray(publicacao.diasVermelhos) ? publicacao.diasVermelhos : [],
      dados: publicacao.dados,
      cores: publicacao.cores && typeof publicacao.cores === 'object' ? publicacao.cores : {}
    };

    const arquivo = obterArquivoEscalaPublicada_(true);
    let colecao;
    try {
      colecao = normalizarColecaoEscalasPublicadas_(
        JSON.parse(arquivo.getBlob().getDataAsString('UTF-8'))
      );
    } catch (erro) {
      colecao = { versao: 2, escalas: {} };
    }

    // Publicar novamente o mesmo mês atualiza somente aquele mês.
    // As demais escalas publicadas permanecem disponíveis.
    colecao.escalas[conteudo.mesAno] = conteudo;
    colecao.atualizadoEm = publicadoEm;

    arquivo.setContent(JSON.stringify(colecao, null, 2));

    registrarAuditoria_(usuario, 'publicar_escala', {
      mesAno: conteudo.mesAno,
      publicadoEm: publicadoEm
    });

    return {
      sucesso: true,
      mesAno: conteudo.mesAno,
      publicadoEm: publicadoEm,
      quantidadePublicada: Object.keys(colecao.escalas).length
    };
  } finally {
    lock.releaseLock();
  }
}

// Publicação de rascunho manual com verificação de versão sob o mesmo lock.
// Conflitos não alteram nenhum arquivo.
function publicarRascunhoManual(publicacao, novoEstado, versaoCliente, token) {
  const usuario = exigirPerfil_(token, ['administrador', 'editor']);
  validarPublicacaoEscala_(publicacao);
  if (!novoEstado || typeof novoEstado !== 'object' || !novoEstado.escalas ||
      !novoEstado.escalas[publicacao.mesAno] ||
      !Object.values(novoEstado.escalas[publicacao.mesAno].modosGeracao || {}).includes('manual')) {
    throw new Error('Rascunho de escala manual inválido.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const arquivoEstado = obterArquivoEstado_();
    if (!arquivoEstado) throw new Error('estado.json não encontrado.');
    const anteriorTexto = arquivoEstado.getBlob().getDataAsString('UTF-8');
    const anterior = JSON.parse(anteriorTexto);
    if (Number(versaoCliente) !== Number(anterior.versao)) {
      return {sucesso:false, conflito:true, mensagem:'Dados alterados por outro usuário. Recarregue a página.', versaoAtual:anterior.versao};
    }
    const arquivoPublico = obterArquivoEscalaPublicada_(true);
    const publicoAnterior = arquivoPublico.getBlob().getDataAsString('UTF-8');
    const colecao = normalizarColecaoEscalasPublicadas_(JSON.parse(publicoAnterior));
    const agora = new Date().toISOString();
    const mesAno = String(publicacao.mesAno);
    novoEstado.escalas[mesAno].publicadaEm = agora;
    delete novoEstado.escalas[mesAno].alteradaAposPublicacaoEm;
    const dadosPublicacao = {
      publicada:true, publicadoEm:agora, mesAno:mesAno,
      titulo:String(publicacao.titulo || 'Escala de Serviço - Célula Contraincêndio'),
      estrutura:publicacao.estrutura,
      diasVermelhos:Array.isArray(publicacao.diasVermelhos)?publicacao.diasVermelhos:[],
      dados:publicacao.dados,
      cores:publicacao.cores && typeof publicacao.cores === 'object'?publicacao.cores:{}
    };
    colecao.escalas[mesAno] = dadosPublicacao;
    colecao.atualizadoEm = agora;
    const novaVersao = Number(anterior.versao) + 1;
    const estadoGravado = {versao:novaVersao, atualizadoEm:agora, estado:novoEstado};
    // Grava publicação primeiro; em caso de falha no estado, tenta restaurar a publicação.
    arquivoPublico.setContent(JSON.stringify(colecao, null, 2));
    try {
      arquivoEstado.setContent(JSON.stringify(estadoGravado, null, 2));
    } catch (erro) {
      try { arquivoPublico.setContent(publicoAnterior); } catch (erroRollback) {
        console.error('FALHA CRÍTICA: não foi possível reverter a publicação:', erroRollback);
      }
      throw erro;
    }
    try {
      registrarAuditoria_(usuario, 'publicar_escala_manual', {mesAno:mesAno, versaoAnterior:anterior.versao, versaoNova:novaVersao});
    } catch (erroAuditoria) { console.error('Falha na auditoria da publicação:', erroAuditoria); }
    return {sucesso:true, conflito:false, rascunhoManual:true, versao:novaVersao, publicadoEm:agora, mesAno:mesAno};
  } finally { lock.releaseLock(); }
}

function excluirEscalaPublicada(mesAno, token) {
  const usuario = exigirPerfil_(token, ['administrador', 'editor']);
  mesAno = String(mesAno || '');
  if (!/^\d{4}-\d{2}$/.test(mesAno)) throw new Error('Mês/ano inválido para exclusão da publicação.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const arquivo = obterArquivoEscalaPublicada_(false);
    if (!arquivo) return { sucesso: true, mesAno: mesAno, removida: false };

    const colecao = lerColecaoEscalasPublicadas_();
    if (!colecao.escalas || !colecao.escalas[mesAno]) {
      return { sucesso: true, mesAno: mesAno, removida: false };
    }

    delete colecao.escalas[mesAno];
    colecao.atualizadoEm = new Date().toISOString();
    arquivo.setContent(JSON.stringify(colecao, null, 2));

    registrarAuditoria_(usuario, 'excluir_escala_publicada', { mesAno: mesAno });
    return {
      sucesso: true,
      mesAno: mesAno,
      removida: true,
      quantidadePublicada: Object.keys(colecao.escalas).length
    };
  } finally {
    lock.releaseLock();
  }
}

function listarEscalasPublicadas() {
  const colecao = lerColecaoEscalasPublicadas_();

  const escalas = Object.values(colecao.escalas || {})
    .filter(item => item && item.publicada === true && /^\d{4}-\d{2}$/.test(String(item.mesAno || '')))
    .map(item => ({
      mesAno: String(item.mesAno),
      publicadoEm: item.publicadoEm || ''
    }))
    .sort((a, b) => b.mesAno.localeCompare(a.mesAno));

  return { escalas: escalas };
}

function carregarEscalaPublicada(mesAno) {
  const colecao = lerColecaoEscalasPublicadas_();
  const escalas = colecao.escalas || {};
  const meses = Object.keys(escalas)
    .filter(chave => escalas[chave]?.publicada === true)
    .sort();

  if (!meses.length) return { publicada: false };

  let mesEscolhido = String(mesAno || '');

  if (!/^\d{4}-\d{2}$/.test(mesEscolhido) || !escalas[mesEscolhido]?.publicada) {
    const agora = new Date();
    const mesAtual = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'yyyy-MM');

    // O mês corrente abre inicialmente quando estiver publicado.
    // Caso ainda não exista, abre a publicação cronologicamente mais recente.
    mesEscolhido = escalas[mesAtual]?.publicada ? mesAtual : meses[meses.length - 1];
  }

  return escalas[mesEscolhido] || { publicada: false };
}

// =========================================================
// WEB APP
// =========================================================

function doGet() {
 return HtmlService
   .createHtmlOutput('<script>window.location.href="https://s2rcunha.github.io/escala/Index.html"</script>')
   .setTitle('Sistema de Escala CCI');
}


// =========================================================
// API JSON - ROUTER
// =========================================================


// =========================================================
// ESCALAS EVENTUAIS — BANCO INDEPENDENTE E SOB DEMANDA
// =========================================================

function criarIndiceEventuaisInicial_() {
  return {
    versao: 1,
    atualizadoEm: new Date().toISOString(),
    funcoesEventuais: [],
    tiposMissao: [],
    lastrosEventuais: {},
    anos: []
  };
}

function criarBancoEventualAnoInicial_(ano) {
  return {
    ano: Number(ano),
    versao: 1,
    atualizadoEm: new Date().toISOString(),
    missoes: []
  };
}

function obterArquivoPorNomeEventual_(nome, chavePropriedade, criar, conteudoInicial) {
  const props=PropertiesService.getScriptProperties();
  const id=props.getProperty(chavePropriedade);
  if(id){
    try{
      const arq=DriveApp.getFileById(id);
      if(!arq.isTrashed()&&arq.getName()===nome)return arq;
    }catch(e){console.warn('Arquivo eventual em cache não encontrado: '+nome,e);}
  }
  const pasta=obterPasta_(),it=pasta.getFilesByName(nome);
  if(it.hasNext()){
    const arq=it.next();props.setProperty(chavePropriedade,arq.getId());return arq;
  }
  if(!criar)return null;
  const arq=pasta.createFile(nome,JSON.stringify(conteudoInicial,null,2),MimeType.PLAIN_TEXT);
  props.setProperty(chavePropriedade,arq.getId());
  return arq;
}

function obterArquivoIndiceEventuais_(criar) {
  return obterArquivoPorNomeEventual_(NOME_ARQUIVO_EVENTUAIS_INDICE,CHAVE_ARQUIVO_EVENTUAIS_INDICE_ID,criar,criarIndiceEventuaisInicial_());
}

function obterArquivoEventualAno_(ano,criar) {
  ano=Number(ano);
  if(!Number.isInteger(ano)||ano<2000||ano>2200)throw new Error('Ano inválido para o banco de escalas eventuais.');
  return obterArquivoPorNomeEventual_('eventuais_'+ano+'.json',PREFIXO_ARQUIVO_EVENTUAIS_ANO_ID+ano,criar,criarBancoEventualAnoInicial_(ano));
}

function lerJsonArquivoEventual_(arquivo,descricao) {
  try{return JSON.parse(arquivo.getBlob().getDataAsString('UTF-8'));}
  catch(e){throw new Error('O arquivo '+descricao+' contém um JSON inválido.');}
}

function lerIndiceEventuais_(criar) {
  migrarBancoEventualLegadoSeNecessario_();
  const arq=obterArquivoIndiceEventuais_(criar);
  if(!arq)return criarIndiceEventuaisInicial_();
  const d=lerJsonArquivoEventual_(arq,NOME_ARQUIVO_EVENTUAIS_INDICE);
  if(!d||typeof d!=='object')throw new Error('A estrutura de '+NOME_ARQUIVO_EVENTUAIS_INDICE+' é inválida.');
  if(!Array.isArray(d.funcoesEventuais))d.funcoesEventuais=[];
  if(!Array.isArray(d.tiposMissao))d.tiposMissao=[];
  if(!d.lastrosEventuais||typeof d.lastrosEventuais!=='object'||Array.isArray(d.lastrosEventuais))d.lastrosEventuais={};
  if(!Array.isArray(d.anos))d.anos=[];
  d.anos=Array.from(new Set(d.anos.map(Number).filter(Number.isInteger))).sort();
  if(!Number.isFinite(Number(d.versao)))d.versao=1;
  return d;
}

function lerBancoEventualAno_(ano,criar) {
  const arq=obterArquivoEventualAno_(ano,criar);
  if(!arq)return criarBancoEventualAnoInicial_(ano);
  const d=lerJsonArquivoEventual_(arq,'eventuais_'+ano+'.json');
  if(!d||typeof d!=='object')throw new Error('A estrutura de eventuais_'+ano+'.json é inválida.');
  d.ano=Number(ano);if(!Array.isArray(d.missoes))d.missoes=[];
  if(!Number.isFinite(Number(d.versao)))d.versao=1;
  return d;
}

function obterArquivoEscalasEventuaisLegado_(criar) {
  return obterArquivoPorNomeEventual_(NOME_ARQUIVO_ESCALAS_EVENTUAIS,CHAVE_ARQUIVO_ESCALAS_EVENTUAIS_ID,criar,{
    versao:1,atualizadoEm:new Date().toISOString(),funcoesEventuais:[],tiposMissao:[],lastrosEventuais:{},missoes:[]
  });
}

function migrarBancoEventualLegadoSeNecessario_() {
  if(obterArquivoIndiceEventuais_(false))return;
  const legadoArq=obterArquivoEscalasEventuaisLegado_(false);
  if(!legadoArq)return;
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('Não foi possível iniciar a migração das escalas eventuais.');
  try{
    if(obterArquivoIndiceEventuais_(false))return;
    const legado=lerJsonArquivoEventual_(legadoArq,NOME_ARQUIVO_ESCALAS_EVENTUAIS);
    const agora=new Date().toISOString();
    const porAno={};
    (Array.isArray(legado.missoes)?legado.missoes:[]).forEach(function(m){
      const ano=Number(String(m.dataInicio||'').slice(0,4));
      if(Number.isInteger(ano)&&ano>=2000&&ano<=2200)(porAno[ano]||(porAno[ano]=[])).push(m);
    });
    const anos=Object.keys(porAno).map(Number).sort();
    anos.forEach(function(ano){
      const arq=obterArquivoEventualAno_(ano,true);
      const banco=criarBancoEventualAnoInicial_(ano);
      banco.missoes=porAno[ano];banco.atualizadoEm=agora;
      arq.setContent(JSON.stringify(banco,null,2));
    });
    const indice=criarIndiceEventuaisInicial_();
    indice.versao=Math.max(1,Number(legado.versao)||1);
    indice.atualizadoEm=agora;
    indice.funcoesEventuais=Array.isArray(legado.funcoesEventuais)?legado.funcoesEventuais:[];
    indice.tiposMissao=Array.isArray(legado.tiposMissao)?legado.tiposMissao:[];
    indice.lastrosEventuais=(legado.lastrosEventuais&&typeof legado.lastrosEventuais==='object'&&!Array.isArray(legado.lastrosEventuais))?legado.lastrosEventuais:{};
    indice.anos=anos;
    obterArquivoIndiceEventuais_(true).setContent(JSON.stringify(indice,null,2));
    console.log('Migração concluída. O arquivo legado foi preservado sem alterações.');
  }finally{lock.releaseLock();}
}

function salvarIndiceEventuais_(indice) {
  indice.anos=Array.from(new Set((indice.anos||[]).map(Number).filter(Number.isInteger))).sort();
  obterArquivoIndiceEventuais_(true).setContent(JSON.stringify(indice,null,2));
}

function salvarBancoEventualAno_(ano,banco) {
  banco.ano=Number(ano);banco.atualizadoEm=new Date().toISOString();
  obterArquivoEventualAno_(ano,true).setContent(JSON.stringify(banco,null,2));
}

function montarBancoEscalasEventuais_(indice) {
  const missoes=[];
  (indice.anos||[]).forEach(function(ano){
    const b=lerBancoEventualAno_(ano,false);
    if(b&&Array.isArray(b.missoes))Array.prototype.push.apply(missoes,b.missoes);
  });
  missoes.sort(function(a,b){return String(a.dataInicio||'').localeCompare(String(b.dataInicio||''));});
  return {
    versao:Number(indice.versao)||1,
    atualizadoEm:indice.atualizadoEm||'',
    funcoesEventuais:indice.funcoesEventuais||[],
    tiposMissao:indice.tiposMissao||[],
    lastrosEventuais:indice.lastrosEventuais||{},
    anos:indice.anos||[],
    missoes:missoes
  };
}

function localizarMissaoEventual_(indice,missaoId) {
  for(let i=0;i<(indice.anos||[]).length;i++){
    const ano=indice.anos[i],b=lerBancoEventualAno_(ano,false);
    const idx=(b.missoes||[]).findIndex(function(m){return m.id===missaoId;});
    if(idx>=0)return {ano:ano,banco:b,indice:idx,missao:b.missoes[idx]};
  }
  return null;
}

function incrementarVersaoIndiceEventuais_(indice) {
  indice.versao=(Number(indice.versao)||1)+1;
  indice.atualizadoEm=new Date().toISOString();
}

function salvarFuncaoEventual(funcao,versaoCliente,token) {
  const usuario=exigirPerfil_(token,['administrador','editor']),nome=String(funcao&&funcao.nome||'').trim();
  if(!nome)throw new Error('Informe o nome da função eventual.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const indice=lerIndiceEventuais_(true),versao=Number(indice.versao)||1;
    if(Number(versaoCliente)!==versao)throw new Error('As escalas eventuais foram alteradas por outro usuário. Recarregue o módulo antes de salvar.');
    const id=String(funcao&&funcao.id||'').trim();
    if((indice.funcoesEventuais||[]).some(function(f){return f.id!==id&&String(f.nome||'').toLowerCase()===nome.toLowerCase();}))throw new Error('Já existe uma função eventual com esse nome.');
    const agora=new Date().toISOString(),idx=id?indice.funcoesEventuais.findIndex(function(f){return f.id===id;}):-1;
    let salva;
    if(idx>=0){salva=Object.assign({},indice.funcoesEventuais[idx],{nome:nome,atualizadoEm:agora});indice.funcoesEventuais[idx]=salva;}
    else{salva={id:Utilities.getUuid(),nome:nome,criadoEm:agora,atualizadoEm:agora};indice.funcoesEventuais.push(salva);}
    incrementarVersaoIndiceEventuais_(indice);salvarIndiceEventuais_(indice);
    registrarAuditoria_(usuario,idx>=0?'editar_funcao_eventual':'criar_funcao_eventual',{funcaoId:salva.id,nome:salva.nome});
    return montarBancoEscalasEventuais_(indice);
  }finally{lock.releaseLock();}
}

function excluirFuncaoEventual(funcaoId,versaoCliente,token) {
  const usuario=exigirPerfil_(token,['administrador','editor']),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const indice=lerIndiceEventuais_(true),versao=Number(indice.versao)||1;
    if(Number(versaoCliente)!==versao)throw new Error('As escalas eventuais foram alteradas por outro usuário. Recarregue o módulo antes de excluir.');
    const idx=(indice.funcoesEventuais||[]).findIndex(function(f){return f.id===funcaoId;});if(idx<0)throw new Error('Função eventual não encontrada.');
    const removida=indice.funcoesEventuais[idx];
    const emUso=montarBancoEscalasEventuais_(indice).missoes.some(function(m){return (m.estrutura||[]).some(function(e){return e.funcao===removida.nome;});});
    if(emUso)throw new Error('Esta função eventual está sendo utilizada por uma ou mais missões e não pode ser excluída.');
    indice.funcoesEventuais.splice(idx,1);incrementarVersaoIndiceEventuais_(indice);salvarIndiceEventuais_(indice);
    registrarAuditoria_(usuario,'excluir_funcao_eventual',{funcaoId:removida.id,nome:removida.nome});
    return montarBancoEscalasEventuais_(indice);
  }finally{lock.releaseLock();}
}

function salvarTipoMissaoEventual(tipoMissao,versaoCliente,token) {
  const usuario=exigirPerfil_(token,['administrador','editor']);
  if(!tipoMissao||typeof tipoMissao!=='object')throw new Error('Tipo de missão não informado.');
  const nome=String(tipoMissao.nome||'').trim();if(!nome)throw new Error('Informe o nome do tipo de missão.');
  const distribuicao=String(tipoMissao.tipoDistribuicao||'corrida');if(['corrida','diferenciada'].indexOf(distribuicao)<0)throw new Error('Sistema de distribuição inválido.');
  const funcoes=Array.isArray(tipoMissao.funcoes)?tipoMissao.funcoes.map(function(f){return {funcao:String(f&&f.funcao||'').trim(),participantes:Array.isArray(f&&f.participantes)?Array.from(new Set(f.participantes.map(String).filter(Boolean))):[]};}).filter(function(f){return f.funcao&&f.participantes.length;}):[];
  if(!funcoes.length)throw new Error('Cadastre pelo menos uma função com militares habilitados.');
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const indice=lerIndiceEventuais_(true),versao=Number(indice.versao)||1;
    if(Number(versaoCliente)!==versao)throw new Error('As escalas eventuais foram alteradas por outro usuário. Recarregue o módulo.');
    const id=String(tipoMissao.id||'').trim();
    if((indice.tiposMissao||[]).some(function(t){return t.id!==id&&String(t.nome||'').toLowerCase()===nome.toLowerCase();}))throw new Error('Já existe um tipo de missão com esse nome.');
    const agora=new Date().toISOString(),idx=id?indice.tiposMissao.findIndex(function(t){return t.id===id;}):-1;
    const permanencia=String(tipoMissao.permanencia||'fixa')==='diaria'?'diaria':'fixa';
    const salvo={id:idx>=0?id:Utilities.getUuid(),nome:nome,tipoDistribuicao:distribuicao,permanencia:permanencia,funcoes:funcoes,atualizadoEm:agora};
    if(idx>=0){salvo.criadoEm=indice.tiposMissao[idx].criadoEm||agora;indice.tiposMissao[idx]=salvo;}else{salvo.criadoEm=agora;indice.tiposMissao.push(salvo);}
    indice.lastrosEventuais=indice.lastrosEventuais&&typeof indice.lastrosEventuais==='object'?indice.lastrosEventuais:{};
    const lastrosTipo=indice.lastrosEventuais[salvo.id]&&typeof indice.lastrosEventuais[salvo.id]==='object'?indice.lastrosEventuais[salvo.id]:{};
    const lastrosLimpos={};
    salvo.funcoes.forEach(function(item){
      const origem=lastrosTipo[item.funcao]&&typeof lastrosTipo[item.funcao]==='object'?lastrosTipo[item.funcao]:{};
      const destino={};
      item.participantes.forEach(function(militarId){
        const valor=Number(origem[militarId]);
        if(Number.isFinite(valor)&&valor>0)destino[militarId]=Math.floor(valor);
      });
      if(Object.keys(destino).length)lastrosLimpos[item.funcao]=destino;
    });
    if(Object.keys(lastrosLimpos).length)indice.lastrosEventuais[salvo.id]=lastrosLimpos;else delete indice.lastrosEventuais[salvo.id];
    incrementarVersaoIndiceEventuais_(indice);salvarIndiceEventuais_(indice);
    registrarAuditoria_(usuario,idx>=0?'editar_tipo_missao_eventual':'criar_tipo_missao_eventual',{tipoMissaoId:salvo.id,nome:salvo.nome});
    return montarBancoEscalasEventuais_(indice);
  }finally{lock.releaseLock();}
}

function excluirTipoMissaoEventual(tipoMissaoId,versaoCliente,token) {
  const usuario=exigirPerfil_(token,['administrador','editor']),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const indice=lerIndiceEventuais_(true),versao=Number(indice.versao)||1;
    if(Number(versaoCliente)!==versao)throw new Error('As escalas eventuais foram alteradas por outro usuário. Recarregue o módulo.');
    if(montarBancoEscalasEventuais_(indice).missoes.some(function(m){return m.tipoMissaoId===tipoMissaoId;}))throw new Error('Este tipo de missão já possui ocorrências e não pode ser excluído.');
    const idx=(indice.tiposMissao||[]).findIndex(function(t){return t.id===tipoMissaoId;});if(idx<0)throw new Error('Tipo de missão não encontrado.');
    const removido=indice.tiposMissao.splice(idx,1)[0];
    if(indice.lastrosEventuais&&typeof indice.lastrosEventuais==='object')delete indice.lastrosEventuais[tipoMissaoId];
    incrementarVersaoIndiceEventuais_(indice);salvarIndiceEventuais_(indice);
    registrarAuditoria_(usuario,'excluir_tipo_missao_eventual',{tipoMissaoId:removido.id,nome:removido.nome});
    return montarBancoEscalasEventuais_(indice);
  }finally{lock.releaseLock();}
}

function ajustarLastroEventual(ajuste,versaoCliente,token) {
  const usuario=exigirPerfil_(token,['administrador','editor']);
  if(!ajuste||typeof ajuste!=='object')throw new Error('Dados do ajuste de lastro eventual não informados.');
  const tipoMissaoId=String(ajuste.tipoMissaoId||'').trim();
  const funcao=String(ajuste.funcao||'').trim();
  const militarId=String(ajuste.militarId||'').trim();
  const justificativa=String(ajuste.justificativa||'').trim();
  const valor=Number(ajuste.valor);
  if(!tipoMissaoId||!funcao||!militarId)throw new Error('Tipo de Missão, função e militar são obrigatórios.');
  if(!Number.isInteger(valor)||valor<0)throw new Error('O lastro deve ser um número inteiro e não negativo.');
  if(!justificativa)throw new Error('Informe a justificativa do ajuste de lastro.');

  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const indice=lerIndiceEventuais_(true),versao=Number(indice.versao)||1;
    if(Number(versaoCliente)!==versao)throw new Error('As escalas eventuais foram alteradas por outro usuário. Recarregue o módulo antes de ajustar o lastro.');
    const tipo=(indice.tiposMissao||[]).find(function(t){return t.id===tipoMissaoId;});
    if(!tipo)throw new Error('Tipo de missão não encontrado.');
    const item=(tipo.funcoes||[]).find(function(f){return f.funcao===funcao;});
    if(!item)throw new Error('A função informada não pertence a este Tipo de Missão.');
    if((item.participantes||[]).map(String).indexOf(militarId)<0)throw new Error('O militar não está habilitado nesta função do Tipo de Missão.');

    indice.lastrosEventuais=indice.lastrosEventuais&&typeof indice.lastrosEventuais==='object'?indice.lastrosEventuais:{};
    const porTipo=indice.lastrosEventuais[tipoMissaoId]||(indice.lastrosEventuais[tipoMissaoId]={});
    const porFuncao=porTipo[funcao]||(porTipo[funcao]={});
    const anterior=Number(porFuncao[militarId])||0;
    if(valor>0)porFuncao[militarId]=valor;else delete porFuncao[militarId];
    if(!Object.keys(porFuncao).length)delete porTipo[funcao];
    if(!Object.keys(porTipo).length)delete indice.lastrosEventuais[tipoMissaoId];

    incrementarVersaoIndiceEventuais_(indice);salvarIndiceEventuais_(indice);
    registrarAuditoria_(usuario,'ajustar_lastro_eventual',{
      tipoMissaoId:tipoMissaoId,tipoMissao:tipo.nome,funcao:funcao,militarId:militarId,
      valorAnterior:anterior,valorNovo:valor,justificativa:justificativa
    });
    return montarBancoEscalasEventuais_(indice);
  }finally{lock.releaseLock();}
}

function carregarEscalasEventuais(token) {
  exigirPerfil_(token,['administrador','editor','visualizador']);
  return montarBancoEscalasEventuais_(lerIndiceEventuais_(true));
}

function validarMissaoEventual_(missao) {
  if(!missao||typeof missao!=='object')throw new Error('Dados da missão não informados.');
  const nome=String(missao.nome||'').trim(),dataInicio=String(missao.dataInicio||'').trim(),dataFim=String(missao.dataFim||'').trim(),tipoDistribuicao=String(missao.tipoDistribuicao||'corrida').trim();
  if(!nome)throw new Error('Informe o nome da missão.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)||!/^\d{4}-\d{2}-\d{2}$/.test(dataFim))throw new Error('Informe datas válidas para a missão.');
  if(dataFim<dataInicio)throw new Error('A data final não pode ser anterior à data inicial.');
  if(!['corrida','diferenciada'].includes(tipoDistribuicao))throw new Error('Tipo de distribuição eventual inválido.');
  return {
    id:String(missao.id||'').trim(),tipoMissaoId:String(missao.tipoMissaoId||'').trim(),nome:nome,descricao:String(missao.descricao||'').trim(),
    dataInicio:dataInicio,dataFim:dataFim,tipoDistribuicao:tipoDistribuicao,status:String(missao.status||'planejamento').trim()||'planejamento',permanencia:String(missao.permanencia||'fixa')==='diaria'?'diaria':'fixa',
    estrutura:Array.isArray(missao.estrutura)?missao.estrutura.map(function(item){return {funcao:String(item&&item.funcao||'').trim(),vagas:Math.max(0,Math.floor(Number(item&&item.vagas)||0)),participantes:Array.isArray(item&&item.participantes)?Array.from(new Set(item.participantes.map(function(id){return String(id||'').trim();}).filter(Boolean))):[]};}).filter(function(item){return item.funcao&&item.vagas>0;}):[],
    escala:(missao.escala&&typeof missao.escala==='object')?missao.escala:{},alteracoesManuais:Array.isArray(missao.alteracoesManuais)?missao.alteracoesManuais:[],
    publicadaEm:missao.publicadaEm?String(missao.publicadaEm):'',publicadaPor:missao.publicadaPor&&typeof missao.publicadaPor==='object'?missao.publicadaPor:null,
    geradaEm:missao.geradaEm?String(missao.geradaEm):'',geradaPor:missao.geradaPor&&typeof missao.geradaPor==='object'?missao.geradaPor:null
  };
}

function salvarEscalaEventual(missao,versaoCliente,token) {
  const usuario=exigirPerfil_(token,['administrador','editor']),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const indice=lerIndiceEventuais_(true),versao=Number(indice.versao)||1;
    if(Number(versaoCliente)!==versao)throw new Error('As escalas eventuais foram alteradas por outro usuário. Recarregue o módulo antes de salvar.');
    const limpa=validarMissaoEventual_(missao),anoDestino=Number(limpa.dataInicio.slice(0,4)),agora=new Date().toISOString();
    let existente=limpa.id?localizarMissaoEventual_(indice,limpa.id):null;
    let bancoDestino;
    if(existente&&existente.ano!==anoDestino){
      existente.banco.missoes.splice(existente.indice,1);existente.banco.versao=(Number(existente.banco.versao)||1)+1;salvarBancoEventualAno_(existente.ano,existente.banco);
      bancoDestino=lerBancoEventualAno_(anoDestino,true);existente=null;
    }else bancoDestino=existente?existente.banco:lerBancoEventualAno_(anoDestino,true);

    const idx=existente?existente.indice:-1;
    if(idx>=0){
      const anterior=bancoDestino.missoes[idx];
      bancoDestino.missoes[idx]=Object.assign({},anterior,limpa,{atualizadoEm:agora,atualizadoPor:usuarioPublico_(usuario)});
    }else{
      if(!limpa.id)limpa.id=Utilities.getUuid();
      bancoDestino.missoes.push(Object.assign({},limpa,{criadoEm:agora,atualizadoEm:agora,criadoPor:usuarioPublico_(usuario),atualizadoPor:usuarioPublico_(usuario)}));
    }
    bancoDestino.versao=(Number(bancoDestino.versao)||1)+1;salvarBancoEventualAno_(anoDestino,bancoDestino);
    if(indice.anos.indexOf(anoDestino)<0)indice.anos.push(anoDestino);
    incrementarVersaoIndiceEventuais_(indice);salvarIndiceEventuais_(indice);
    registrarAuditoria_(usuario,idx>=0?'editar_escala_eventual':'criar_escala_eventual',{missaoId:limpa.id,nome:limpa.nome,ano:anoDestino});
    return montarBancoEscalasEventuais_(indice);
  }finally{lock.releaseLock();}
}

function excluirEscalaEventual(missaoId,versaoCliente,token) {
  const usuario=exigirPerfil_(token,['administrador','editor']),lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const indice=lerIndiceEventuais_(true),versao=Number(indice.versao)||1;
    if(Number(versaoCliente)!==versao)throw new Error('As escalas eventuais foram alteradas por outro usuário. Recarregue o módulo antes de excluir.');
    const achada=localizarMissaoEventual_(indice,missaoId);if(!achada)throw new Error('Missão eventual não encontrada.');
    const removida=achada.banco.missoes.splice(achada.indice,1)[0];
    achada.banco.versao=(Number(achada.banco.versao)||1)+1;salvarBancoEventualAno_(achada.ano,achada.banco);
    if(!achada.banco.missoes.length){
      // Mantém o arquivo anual vazio por segurança/histórico, mas retira o ano do índice ativo.
      indice.anos=(indice.anos||[]).filter(function(a){return Number(a)!==Number(achada.ano);});
    }
    incrementarVersaoIndiceEventuais_(indice);salvarIndiceEventuais_(indice);
    registrarAuditoria_(usuario,'excluir_escala_eventual',{missaoId:removida.id,nome:removida.nome,ano:achada.ano});
    return montarBancoEscalasEventuais_(indice);
  }finally{lock.releaseLock();}
}

function doPost(e) {
  return handleApiRequest_(e);
}

function handleApiRequest_(e) {
  try {
    let funcao = null;
    let params = {};

    if (e && e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        funcao = body.funcao;
        params = body.params || {};
      } catch (erro) {
        return apiResponse_({ sucesso: false, erro: 'Corpo da requisição inválido.' }, true);
      }
    } else if (e && e.parameter && e.parameter.funcao) {
      funcao = e.parameter.funcao;
      const chaves = Object.keys(e.parameter).filter(function(k) { return k !== 'funcao'; });
      chaves.forEach(function(k) { params[k] = e.parameter[k]; });
    }

    if (!funcao) {
      return apiResponse_({ sucesso: false, erro: 'Nenhuma função especificada.' }, true);
    }

    const resultado = ROTEAMENTO[funcao];
    if (!resultado) {
      return apiResponse_({ sucesso: false, erro: 'Função não encontrada: ' + funcao }, true);
    }

    const resposta = resultado(params);
    return apiResponse_({ sucesso: true, dados: resposta });

  } catch (erro) {
    return apiResponse_({ sucesso: false, erro: erro.message || String(erro) }, true);
  }
}

function apiResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const ROTEAMENTO = {
  login: function(p) { return login(p.saram, p.senha); },
  logout: function(p) { return logout(p.token); },
  validarSessao: function(p) { return validarSessao(p.token); },
  carregarDados: function(p) { return carregarDados(p.token); },
  salvarDados: function(p) { return salvarDados(p.novoEstado, p.versaoCliente, p.token, p.contextoOperacao); },
  criarBackupManual: function(p) { return criarBackupManual(p.token); },
  listarBackups: function(p) { return listarBackups(p.token); },
  restaurarBackup: function(p) { return restaurarBackup(p.arquivoId, p.versaoCliente, p.token); },
  excluirBackup: function(p) { return excluirBackup(p.arquivoId, p.versaoCliente, p.token); },
  listarUsuarios: function(p) { return listarUsuarios(p.token); },
  cadastrarUsuario: function(p) { return cadastrarUsuario(p.dadosUsuario, p.token); },
  atualizarUsuario: function(p) { return atualizarUsuario(p.dadosUsuario, p.token); },
  redefinirSenhaUsuario: function(p) { return redefinirSenhaUsuario(p.usuarioId, p.novaSenha, p.token); },
  excluirUsuario: function(p) { return excluirUsuario(p.usuarioId, p.token); },
  listarAuditoria: function(p) { return listarAuditoria(p.token, p.limite); },
  publicarEscala: function(p) { return publicarEscala(p.publicacao, p.token); },
  publicarRascunhoManual: function(p) { return publicarRascunhoManual(p.publicacao, p.novoEstado, p.versaoCliente, p.token); },
  excluirEscalaPublicada: function(p) { return excluirEscalaPublicada(p.mesAno, p.token); },
  carregarEscalaPublicada: function(p) { return carregarEscalaPublicada(p.mesAno); },
  listarEscalasPublicadas: function(p) { return listarEscalasPublicadas(); },
  carregarEscalasEventuais: function(p) { return carregarEscalasEventuais(p.token); },
  salvarEscalaEventual: function(p) { return salvarEscalaEventual(p.missao, p.versaoCliente, p.token); },
  excluirEscalaEventual: function(p) { return excluirEscalaEventual(p.missaoId, p.versaoCliente, p.token); },
  salvarFuncaoEventual: function(p) { return salvarFuncaoEventual(p.funcao, p.versaoCliente, p.token); },
  salvarTipoMissaoEventual: function(p) { return salvarTipoMissaoEventual(p.tipoMissao, p.versaoCliente, p.token); },
  excluirTipoMissaoEventual: function(p) { return excluirTipoMissaoEventual(p.tipoMissaoId, p.versaoCliente, p.token); },
  excluirFuncaoEventual: function(p) { return excluirFuncaoEventual(p.funcaoId, p.versaoCliente, p.token); },
  inicializarBanco_: function(p) { return inicializarBanco_(); },
  inicializarUsuarios_: function(p) { return inicializarUsuarios_(p.nome, p.saram, p.senha); }
};


// =========================================================
// CONSULTAR BACKUPS
// =========================================================

function obterBackupValidoPorId_(arquivoId) {

  if (
    !arquivoId ||
    typeof arquivoId !== 'string'
  ) {
    throw new Error(
      'ID do backup inválido.'
    );
  }

  const arquivo =
    DriveApp.getFileById(arquivoId);

  if (arquivo.isTrashed()) {
    throw new Error(
      'O backup selecionado está na lixeira.'
    );
  }

  const nome =
    arquivo.getName();

  if (
    !nome.startsWith('backup_') ||
    !nome.endsWith('.json')
  ) {
    throw new Error(
      'O arquivo selecionado não é um backup válido.'
    );
  }

  // Confirma que o arquivo pertence à pasta de backups do sistema.
  const pastaBackups =
    obterPastaBackups_();

  const idPastaBackups =
    pastaBackups.getId();

  const pais =
    arquivo.getParents();

  let pertencePastaBackups =
    false;

  while (pais.hasNext()) {

    const pasta =
      pais.next();

    if (
      pasta.getId() ===
      idPastaBackups
    ) {
      pertencePastaBackups =
        true;

      break;
    }
  }

  if (!pertencePastaBackups) {
    throw new Error(
      'O arquivo selecionado não pertence à pasta de backups deste sistema.'
    );
  }

  return arquivo;
}


function validarEstruturaBackup_(dados) {

  if (
    !dados ||
    typeof dados !== 'object'
  ) {
    throw new Error(
      'O conteúdo do backup é inválido.'
    );
  }

  if (
    !dados.estado ||
    typeof dados.estado !== 'object'
  ) {
    throw new Error(
      'O backup não contém um estado válido.'
    );
  }

  if (
    !Number.isFinite(
      Number(dados.versao)
    )
  ) {
    throw new Error(
      'O backup não contém uma versão válida.'
    );
  }

  const estadoBackup =
    dados.estado;

  if (
    !Array.isArray(
      estadoBackup.funcoes
    ) ||
    !Array.isArray(
      estadoBackup.militares
    ) ||
    !estadoBackup.vagas ||
    typeof estadoBackup.vagas !== 'object' ||
    !Array.isArray(
      estadoBackup.indisponibilidades
    ) ||
    !Array.isArray(
      estadoBackup.indisponibilidadesSemana
    ) ||
    !estadoBackup.diasEspeciais ||
typeof estadoBackup.diasEspeciais !== 'object' ||
!estadoBackup.escalas ||
typeof estadoBackup.escalas !== 'object'
  ) {
    throw new Error(
      'A estrutura interna do backup é incompatível com o sistema.'
    );
  }

  return true;
}

function lerConteudoBackup_(arquivo) {

  const conteudo =
    arquivo
      .getBlob()
      .getDataAsString('UTF-8');

  const dados = JSON.parse(conteudo);

  validarEstruturaBackup_(dados);

  return {
    conteudo: conteudo,
    dados: dados
  };
}


function extrairTipoBackup_(nomeArquivo) {

  if (nomeArquivo.indexOf('backup_manual_') === 0) {
    return 'manual';
  }

  if (nomeArquivo.indexOf('backup_pre_restauracao_') === 0) {
    return 'pre_restauracao';
  }

  return 'automatico';
}


function listarBackups(token) {

  exigirPerfil_(
    token,
    ['administrador']
  );

  const arquivos =
    obterPastaBackups_().getFiles();

  const backups = [];

  while (arquivos.hasNext()) {

    const arquivo = arquivos.next();
    const nome = arquivo.getName();

    if (
      arquivo.isTrashed() ||
      !/^backup_(automatico|manual|pre_restauracao)_v\d+_.*\.json$/.test(nome)
    ) {
      continue;
    }

    try {

      const backup = lerConteudoBackup_(arquivo);

      backups.push({
        arquivoId: arquivo.getId(),
        nome: nome,
        tipo: extrairTipoBackup_(nome),
        versao: Number(backup.dados.versao),
        criadoEm: arquivo.getDateCreated().toISOString(),
        tamanhoBytes: arquivo.getSize()
      });

    } catch (erro) {
      console.warn(
        'Backup ignorado por ser invalido: ' + nome
      );
    }
  }

  backups.sort(function(a, b) {
    return new Date(b.criadoEm) - new Date(a.criadoEm);
  });

  return {
    sucesso: true,
    backups: backups
  };
}


// =========================================================
// RESTAURAR BACKUP
// =========================================================

function restaurarBackup(
  arquivoId,
  versaoCliente,
  token
) {

  const usuarioOperacao = exigirPerfil_(
    token,
    ['administrador']
  );

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    // =====================================================
    // 1. LÊ O BANCO ATUAL
    // =====================================================

    const arquivoEstado =
      obterArquivoEstado_();

    if (!arquivoEstado) {
      throw new Error(
        'Arquivo estado.json não encontrado.'
      );
    }

    const conteudoAtual =
      arquivoEstado
        .getBlob()
        .getDataAsString('UTF-8');

    const dadosAtuais =
      JSON.parse(conteudoAtual);


    // =====================================================
    // 2. VERIFICA CONFLITO
    // =====================================================

    if (
      Number(versaoCliente) !==
      Number(dadosAtuais.versao)
    ) {
      return {
        sucesso: false,
        conflito: true,
        mensagem:
          'Os dados foram alterados por outro usuário antes da restauração.',
        versaoAtual:
          dadosAtuais.versao
      };
    }


    // =====================================================
    // 3. LOCALIZA E VALIDA O BACKUP
    // =====================================================

    const arquivoBackup =
      obterBackupValidoPorId_(
        arquivoId
      );

    const conteudoBackup =
      arquivoBackup
        .getBlob()
        .getDataAsString('UTF-8');

    let dadosBackup;

    try {
      dadosBackup =
        JSON.parse(
          conteudoBackup
        );
    } catch (erro) {
      throw new Error(
        'O arquivo de backup contém um JSON inválido.'
      );
    }

    validarEstruturaBackup_(
      dadosBackup
    );


    // =====================================================
    // 4. CRIA BACKUP DE SEGURANÇA DO ESTADO ATUAL
    // =====================================================

    criarBackupEstado_(
      conteudoAtual,
      dadosAtuais.versao,
      'pre_restauracao'
    );

    // A restauração não altera o relógio do backup automático.


    // =====================================================
    // 5. MANTÉM A VERSÃO SEMPRE CRESCENTE
    // =====================================================

    const novaVersao =
      Number(
        dadosAtuais.versao
      ) + 1;

    const dadosRestaurados = {
      versao:
        novaVersao,
      atualizadoEm:
        new Date().toISOString(),
      estado:
        dadosBackup.estado
    };


    // =====================================================
    // 6. GRAVA O CONTEÚDO RESTAURADO
    // =====================================================

    arquivoEstado.setContent(
      JSON.stringify(
        dadosRestaurados,
        null,
        2
      )
    );

    registrarAuditoria_(usuarioOperacao, 'restaurar_backup', {
      arquivoId: arquivoId,
      versaoAnterior: Number(dadosAtuais.versao),
      versaoBackup: Number(dadosBackup.versao),
      versaoNova: novaVersao
    });


    // =====================================================
    // 7. RETORNA RESULTADO
    // =====================================================

    return {
      sucesso: true,
      conflito: false,
      versao:
        novaVersao,
      versaoBackup:
        Number(
          dadosBackup.versao
        ),
      backupRestaurado:
        arquivoBackup.getName(),
      atualizadoEm:
        dadosRestaurados.atualizadoEm
    };

  } finally {
    lock.releaseLock();
  }
}


// =========================================================
// EXCLUIR BACKUP
// =========================================================

function excluirBackup(
  arquivoId,
  versaoCliente,
  token
) {

  const usuarioOperacao = exigirPerfil_(
    token,
    ['administrador']
  );

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    // =====================================================
    // 1. CONFIRMA QUE O CLIENTE ESTÁ ATUALIZADO
    // =====================================================

    const arquivoEstado =
      obterArquivoEstado_();

    if (!arquivoEstado) {
      throw new Error(
        'Arquivo estado.json não encontrado.'
      );
    }

    const conteudoAtual =
      arquivoEstado
        .getBlob()
        .getDataAsString('UTF-8');

    const dadosAtuais =
      JSON.parse(conteudoAtual);

    if (
      Number(versaoCliente) !==
      Number(dadosAtuais.versao)
    ) {
      return {
        sucesso: false,
        conflito: true,
        mensagem:
          'Os dados foram alterados por outro usuário.',
        versaoAtual:
          dadosAtuais.versao
      };
    }


    // =====================================================
    // 2. LOCALIZA E VALIDA O BACKUP
    // =====================================================

    const arquivoBackup =
      obterBackupValidoPorId_(
        arquivoId
      );

    const nomeBackup =
      arquivoBackup.getName();


    // =====================================================
    // 3. MOVE O BACKUP PARA A LIXEIRA
    // =====================================================

    arquivoBackup.setTrashed(true);

    registrarAuditoria_(usuarioOperacao, 'excluir_backup', {
      arquivoId: arquivoId, nome: nomeBackup
    });


    // =====================================================
    // 4. RETORNA RESULTADO
    // =====================================================

    return {
      sucesso: true,
      conflito: false,
      nome:
        nomeBackup
    };

  } finally {
    lock.releaseLock();
  }
}


// =========================================================
// ARQUIVO usuarios.json
// =========================================================

function obterArquivoUsuarios_() {

  const propriedades =
    PropertiesService.getScriptProperties();

  const arquivoId =
    propriedades.getProperty(
      CHAVE_ARQUIVO_USUARIOS_ID
    );

  // Primeiro tenta localizar pelo ID conhecido.
  if (arquivoId) {

    try {

      const arquivo =
        DriveApp.getFileById(arquivoId);

      if (
        arquivo &&
        !arquivo.isTrashed() &&
        arquivo.getName() === NOME_ARQUIVO_USUARIOS
      ) {

        return arquivo;
      }

    } catch (erro) {

      console.warn(
        'ID salvo do usuarios.json não é mais válido:',
        erro
      );
    }
  }


  // Fallback: procura pelo nome na pasta principal.
  const arquivos =
    obterPasta_().getFilesByName(
      NOME_ARQUIVO_USUARIOS
    );

  if (!arquivos.hasNext()) {
    return null;
  }

  const arquivo =
    arquivos.next();

  propriedades.setProperty(
    CHAVE_ARQUIVO_USUARIOS_ID,
    arquivo.getId()
  );

  return arquivo;
}


// =========================================================
// HASH DE SENHA
// =========================================================

function gerarSaltUsuario_() {

  return Utilities
    .getUuid()
    .replace(/-/g, '');
}


function gerarHashSenhaLegado_(
  senha,
  salt
) {

  if (
    typeof senha !== 'string' ||
    senha.length < 8
  ) {

    throw new Error(
      'A senha deve possuir pelo menos 8 caracteres.'
    );
  }

  const bytes =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      salt + senha,
      Utilities.Charset.UTF_8
    );

  return bytes
    .map(function(byte) {

      const valor =
        byte < 0
          ? byte + 256
          : byte;

      return (
        '0' +
        valor.toString(16)
      ).slice(-2);

    })
    .join('');
}


// =========================================================
// LER BANCO DE USUÁRIOS
// =========================================================

function lerUsuarios_() {

  const arquivo =
    obterArquivoUsuarios_();

  if (!arquivo) {

    throw new Error(
      'Arquivo usuarios.json não encontrado.'
    );
  }

  const conteudo =
    arquivo
      .getBlob()
      .getDataAsString('UTF-8');

  let dados;

  try {

    dados =
      JSON.parse(conteudo);

  } catch (erro) {

    throw new Error(
      'O arquivo usuarios.json contém um JSON inválido.'
    );
  }

  if (
    !dados ||
    typeof dados !== 'object' ||
    !Array.isArray(dados.usuarios)
  ) {

    throw new Error(
      'A estrutura do arquivo usuarios.json é inválida.'
    );
  }

  return dados;
}

function salvarUsuarios_(dados) {
  const arquivo = obterArquivoUsuarios_();
  if (!arquivo) throw new Error('Arquivo usuarios.json nao encontrado.');
  dados.atualizadoEm = new Date().toISOString();
  dados.versao = Number(dados.versao || 0) + 1;
  arquivo.setContent(JSON.stringify(dados, null, 2));
}

function normalizarSaram_(saram) {
  return String(saram || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function obterPepperSenhas_() {
  const propriedades = PropertiesService.getScriptProperties();
  let pepper = propriedades.getProperty(CHAVE_PEPPER_SENHAS);
  if (!pepper) {
    pepper = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    propriedades.setProperty(CHAVE_PEPPER_SENHAS, pepper);
  }
  return pepper;
}

function bytesParaHex_(bytes) {
  return bytes.map(function(byte) {
    const valor = byte < 0 ? byte + 256 : byte;
    return ('0' + valor.toString(16)).slice(-2);
  }).join('');
}

function derivarSenha_(senha, salt) {
  if (typeof senha !== 'string' || senha.length < 8) {
    throw new Error('A senha deve possuir pelo menos 8 caracteres.');
  }
  const pepper = obterPepperSenhas_();
  let resultado = Utilities.computeHmacSha256Signature(
    salt + ':' + senha,
    pepper,
    Utilities.Charset.UTF_8
  );
  for (let indice = 1; indice < ITERACOES_HASH_SENHA; indice++) {
    resultado = Utilities.computeHmacSha256Signature(
      bytesParaHex_(resultado) + ':' + salt,
      pepper,
      Utilities.Charset.UTF_8
    );
  }
  return bytesParaHex_(resultado);
}

function usuarioPublico_(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    saram: usuario.saram,
    perfil: usuario.perfil,
    ativo: usuario.ativo === true,
    criadoEm: usuario.criadoEm || '',
    atualizadoEm: usuario.atualizadoEm || ''
  };
}


// =========================================================
// INICIALIZAR SISTEMA DE USUÁRIOS
// =========================================================

function inicializarUsuarios_(
  nome,
  saram,
  senha
) {

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    if (obterArquivoUsuarios_()) {

      throw new Error(
        'O sistema de usuários já foi inicializado.'
      );
    }

    nome =
      String(nome || '').trim();

    saram = normalizarSaram_(saram);

    senha =
      String(senha || '');

    if (!nome) {

      throw new Error(
        'Informe o nome do administrador.'
      );
    }

    if (!saram) {

      throw new Error(
        'Informe o SARAM do administrador.'
      );
    }

    if (senha.length < 8) {

      throw new Error(
        'A senha deve possuir pelo menos 8 caracteres.'
      );
    }

    const salt =
      gerarSaltUsuario_();

    const hashSenha = derivarSenha_(senha, salt);

    const agora =
      new Date().toISOString();

    const dados = {

      versao: 1,

      atualizadoEm:
        agora,

      usuarios: [
        {
          id:
            Utilities.getUuid(),

          nome:
            nome,

          saram:
            saram,

          perfil:
            'administrador',

          ativo:
            true,

          salt:
            salt,

          hashSenha:
            hashSenha,

          algoritmoSenha:
            'hmac-sha256-iterativo-v1',

          criadoEm:
            agora
        }
      ]
    };

    const arquivo =
      obterPasta_().createFile(
        NOME_ARQUIVO_USUARIOS,
        JSON.stringify(
          dados,
          null,
          2
        ),
        MimeType.PLAIN_TEXT
      );

    PropertiesService
      .getScriptProperties()
      .setProperty(
        CHAVE_ARQUIVO_USUARIOS_ID,
        arquivo.getId()
      );

    return {
      sucesso: true,
      mensagem:
        'Administrador inicial criado com sucesso.',
      usuario: {
        nome: nome,
        saram: saram,
        perfil: 'administrador'
      }
    };

  } finally {

    lock.releaseLock();
  }
}
// =========================================================
// AUTENTICAÇÃO - LOGIN E SESSÕES
// =========================================================


// =========================================================
// COMPARAÇÃO SEGURA DE HASHES
// =========================================================

function hashesIguais_(hashA, hashB) {

  hashA = String(hashA || '');
  hashB = String(hashB || '');

  if (hashA.length !== hashB.length) {
    return false;
  }

  let diferenca = 0;

  for (let i = 0; i < hashA.length; i++) {

    diferenca |=
      hashA.charCodeAt(i) ^
      hashB.charCodeAt(i);
  }

  return diferenca === 0;
}


// =========================================================
// GERAR TOKEN DE SESSÃO
// =========================================================

function gerarTokenSessao_() {

  const parte1 =
    Utilities.getUuid().replace(/-/g, '');

  const parte2 =
    Utilities.getUuid().replace(/-/g, '');

  return parte1 + parte2;
}


// =========================================================
// LOCALIZAR USUÁRIO PELO SARAM
// =========================================================

function localizarUsuarioPorSaram_(saram) {

  const dados =
    lerUsuarios_();

  const saramNormalizado = normalizarSaram_(saram);

  if (!saramNormalizado) {
    return null;
  }

  return (
    dados.usuarios.find(function(usuario) {

      return (
        normalizarSaram_(usuario.saram) ===
        saramNormalizado
      );

    }) || null
  );
}

function chaveSessao_(token) {
  const assinatura = Utilities.computeHmacSha256Signature(
    String(token || ''),
    obterPepperSenhas_(),
    Utilities.Charset.UTF_8
  );
  return PREFIXO_SESSAO + bytesParaHex_(assinatura);
}

function limparSessoesExpiradas_() {
  const propriedades = PropertiesService.getScriptProperties();
  const todas = propriedades.getProperties();
  const agora = Date.now();
  Object.keys(todas).forEach(function(chave) {
    if (chave.indexOf(PREFIXO_SESSAO) !== 0) return;
    try {
      const sessao = JSON.parse(todas[chave]);
      if (!Number.isFinite(Number(sessao.expiraEm)) || Number(sessao.expiraEm) <= agora) {
        propriedades.deleteProperty(chave);
      }
    } catch (erro) {
      propriedades.deleteProperty(chave);
    }
  });
}


// =========================================================
// CRIAR SESSÃO
// =========================================================

function criarSessao_(usuario) {

  limparSessoesExpiradas_();

  const token =
    gerarTokenSessao_();

  const agora =
    Date.now();

  const sessao = {

    usuarioId:
      usuario.id,

    nome:
      usuario.nome,

    saram:
      usuario.saram,

    perfil:
      usuario.perfil,

    criadaEm:
      agora,

    expiraEm:
      agora + DURACAO_SESSAO_MS
  };

  PropertiesService
    .getScriptProperties()
    .setProperty(
      chaveSessao_(token),
      JSON.stringify(sessao)
    );

  return {
    token: token,
    sessao: sessao
  };
}


// =========================================================
// LOGIN
// =========================================================

function login(
  saram,
  senha
) {
  saram = normalizarSaram_(saram);
  senha = String(senha || '');
  if (!saram || !senha) return { sucesso: false, mensagem: 'Informe o SARAM e a senha.' };

  const cache = CacheService.getScriptCache();
  const chaveTentativas = PREFIXO_TENTATIVA_LOGIN + saram;
  const tentativas = Number(cache.get(chaveTentativas) || 0);
  if (tentativas >= MAX_TENTATIVAS_LOGIN) {
    return { sucesso: false, mensagem: 'Muitas tentativas de acesso. Aguarde alguns minutos.' };
  }

  const usuario = localizarUsuarioPorSaram_(saram);
  if (!usuario || usuario.ativo !== true || senha.length < 8) {
    cache.put(chaveTentativas, String(tentativas + 1), BLOQUEIO_LOGIN_SEGUNDOS);
    return { sucesso: false, mensagem: 'Usuário ou senha inválidos.' };
  }

  const usaHashNovo = usuario.algoritmoSenha === 'hmac-sha256-iterativo-v1';
  const hashInformado = usaHashNovo
    ? derivarSenha_(senha, usuario.salt)
    : gerarHashSenhaLegado_(senha, usuario.salt);
  if (!hashesIguais_(hashInformado, usuario.hashSenha)) {
    cache.put(chaveTentativas, String(tentativas + 1), BLOQUEIO_LOGIN_SEGUNDOS);
    return { sucesso: false, mensagem: 'Usuário ou senha inválidos.' };
  }

  cache.remove(chaveTentativas);
  if (!usaHashNovo) {
    const dadosUsuarios = lerUsuarios_();
    const usuarioPersistido = dadosUsuarios.usuarios.find(function(item) { return item.id === usuario.id; });
    if (usuarioPersistido) {
      usuarioPersistido.salt = gerarSaltUsuario_();
      usuarioPersistido.hashSenha = derivarSenha_(senha, usuarioPersistido.salt);
      usuarioPersistido.algoritmoSenha = 'hmac-sha256-iterativo-v1';
      usuarioPersistido.atualizadoEm = new Date().toISOString();
      salvarUsuarios_(dadosUsuarios);
    }
  }

  const resultadoSessao =
  criarSessao_(usuario);

registrarAuditoria_(
  usuario,
  'login_sucesso',
  {
    perfil: usuario.perfil
  }
);

return {
  sucesso: true,
  token: resultadoSessao.token,
  usuario: usuarioPublico_(usuario),
  expiraEm: resultadoSessao.sessao.expiraEm
};
}


// =========================================================
// VALIDAR SESSÃO
// =========================================================

function validarSessao(token) {

  token =
    String(token || '').trim();

  if (!token) {

    return {
      valida: false,
      motivo:
        'Sessão não informada.'
    };
  }


  const propriedades =
    PropertiesService.getScriptProperties();

  const chave = chaveSessao_(token);

  const conteudo =
    propriedades.getProperty(
      chave
    );


  if (!conteudo) {

    return {
      valida: false,
      motivo:
        'Sessão inválida.'
    };
  }


  let sessao;

  try {

    sessao =
      JSON.parse(conteudo);

  } catch (erro) {

    propriedades.deleteProperty(
      chave
    );

    return {
      valida: false,
      motivo:
        'Sessão inválida.'
    };
  }


  if (
    !Number.isFinite(
      Number(sessao.expiraEm)
    ) ||
    Date.now() >=
      Number(sessao.expiraEm)
  ) {

    propriedades.deleteProperty(
      chave
    );

    return {
      valida: false,
      motivo:
        'Sessão expirada.'
    };
  }


  // Confirma que o usuário ainda existe
  // e continua ativo.
  const usuario =
    localizarUsuarioPorSaram_(
      sessao.saram
    );


  if (
    !usuario ||
    usuario.ativo !== true ||
    usuario.id !== sessao.usuarioId
  ) {

    propriedades.deleteProperty(
      chave
    );

    return {
      valida: false,
      motivo:
        'Usuário não autorizado.'
    };
  }


  return {

    valida: true,

    usuario: usuarioPublico_(usuario),

    expiraEm:
      Number(sessao.expiraEm)
  };
}


// =========================================================
// LOGOUT
// =========================================================

function logout(token) {

  token =
    String(token || '').trim();

  if (token) {

    PropertiesService
      .getScriptProperties()
      .deleteProperty(
        chaveSessao_(token)
      );
  }


  return {
    sucesso: true
  };
}
// =========================================================
// AUTORIZAÇÃO E CONTROLE DE ACESSO
// =========================================================


// =========================================================
// EXIGIR SESSÃO VÁLIDA
// =========================================================

function exigirSessao_(token) {

  const resultado =
    validarSessao(token);

  if (
    !resultado ||
    resultado.valida !== true ||
    !resultado.usuario
  ) {

    throw new Error(
      resultado?.motivo ||
      'Sessão inválida ou expirada.'
    );
  }

  return resultado.usuario;
}


// =========================================================
// EXIGIR PERFIL AUTORIZADO
// =========================================================

function exigirPerfil_(
  token,
  perfisPermitidos
) {

  const usuario =
    exigirSessao_(token);


  if (
    !Array.isArray(perfisPermitidos) ||
    perfisPermitidos.length === 0
  ) {

    throw new Error(
      'Nenhum perfil foi autorizado para esta operação.'
    );
  }


  const perfil =
    String(
      usuario.perfil || ''
    ).trim();


  if (
    !perfisPermitidos.includes(perfil)
  ) {

    throw new Error(
      'Você não possui permissão para realizar esta operação.'
    );
  }


  return usuario;
}

function validarPerfilUsuario_(perfil) {
  perfil = String(perfil || '').trim().toLowerCase();
  if (['administrador', 'editor', 'visualizador'].indexOf(perfil) === -1) {
    throw new Error('Perfil de usuário inválido.');
  }
  return perfil;
}

function invalidarSessoesUsuario_(usuarioId) {
  const propriedades = PropertiesService.getScriptProperties();
  const todas = propriedades.getProperties();
  Object.keys(todas).forEach(function(chave) {
    if (chave.indexOf(PREFIXO_SESSAO) !== 0) return;
    try {
      if (JSON.parse(todas[chave]).usuarioId === usuarioId) propriedades.deleteProperty(chave);
    } catch (erro) {
      propriedades.deleteProperty(chave);
    }
  });
}

function listarUsuarios(token) {
  exigirPerfil_(token, ['administrador']);
  return {
    sucesso: true,
    usuarios: lerUsuarios_().usuarios.map(usuarioPublico_)
  };
}

function cadastrarUsuario(dadosUsuario, token) {
  const administrador = exigirPerfil_(token, ['administrador']);
  const dados = lerUsuarios_();
  const nome = String(dadosUsuario && dadosUsuario.nome || '').trim();
  const saram = normalizarSaram_(dadosUsuario && dadosUsuario.saram);
  const senha = String(dadosUsuario && dadosUsuario.senha || '');
  const perfil = validarPerfilUsuario_(dadosUsuario && dadosUsuario.perfil);
  if (!nome || !saram || senha.length < 8) {
    throw new Error('Informe nome, SARAM e senha com pelo menos 8 caracteres.');
  }
  if (dados.usuarios.some(function(item) { return normalizarSaram_(item.saram) === saram; })) {
    throw new Error('Já existe usuário cadastrado com este SARAM.');
  }
  const agora = new Date().toISOString();
  const salt = gerarSaltUsuario_();
  const usuario = {
    id: Utilities.getUuid(), nome: nome, saram: saram, perfil: perfil, ativo: true,
    salt: salt, hashSenha: derivarSenha_(senha, salt),
    algoritmoSenha: 'hmac-sha256-iterativo-v1', criadoEm: agora, atualizadoEm: agora,
    criadoPor: administrador.id
  };
  dados.usuarios.push(usuario);
  salvarUsuarios_(dados);
  registrarAuditoria_(administrador, 'cadastrar_usuario', { usuario: usuarioPublico_(usuario) });
  return { sucesso: true, usuario: usuarioPublico_(usuario) };
}

function atualizarUsuario(dadosUsuario, token) {
  const administrador = exigirPerfil_(token, ['administrador']);
  const dados = lerUsuarios_();
  const usuario = dados.usuarios.find(function(item) { return item.id === dadosUsuario.id; });
  if (!usuario) throw new Error('Usuário não encontrado.');

  const nome = String(dadosUsuario.nome || '').trim();
  const perfil = validarPerfilUsuario_(dadosUsuario.perfil);
  const ativo = dadosUsuario.ativo === true;
  if (!nome) throw new Error('Informe o nome do usuário.');
  const deixaDeSerAdministrador = usuario.perfil === 'administrador' && (perfil !== 'administrador' || !ativo);
  const administradoresAtivos = dados.usuarios.filter(function(item) {
    return item.perfil === 'administrador' && item.ativo === true;
  });
  if (deixaDeSerAdministrador && administradoresAtivos.length <= 1) {
    throw new Error('O último Administrador ativo não pode ser desativado nem mudar de perfil.');
  }
  if (usuario.id === administrador.id && !ativo) {
    throw new Error('Você não pode desativar o próprio usuário durante a sessão.');
  }

  const perfilAnterior = usuario.perfil;
  const ativoAnterior = usuario.ativo;
  usuario.nome = nome;
  usuario.perfil = perfil;
  usuario.ativo = ativo;
  usuario.atualizadoEm = new Date().toISOString();
  usuario.atualizadoPor = administrador.id;
  salvarUsuarios_(dados);
  if (ativo !== ativoAnterior || perfil !== perfilAnterior) invalidarSessoesUsuario_(usuario.id);
 registrarAuditoria_(
  administrador,
  'atualizar_usuario',
  {
    usuario: usuarioPublico_(usuario),

    perfilAnterior: perfilAnterior,
    perfilNovo: usuario.perfil,

    ativoAnterior: ativoAnterior,
    ativoNovo: usuario.ativo
  }
);
  return { sucesso: true, usuario: usuarioPublico_(usuario) };
}

function redefinirSenhaUsuario(usuarioId, novaSenha, token) {
  const administrador = exigirPerfil_(token, ['administrador']);
  novaSenha = String(novaSenha || '');
  if (novaSenha.length < 8) throw new Error('A senha deve possuir pelo menos 8 caracteres.');
  const dados = lerUsuarios_();
  const usuario = dados.usuarios.find(function(item) { return item.id === usuarioId; });
  if (!usuario) throw new Error('Usuário não encontrado.');
  usuario.salt = gerarSaltUsuario_();
  usuario.hashSenha = derivarSenha_(novaSenha, usuario.salt);
  usuario.algoritmoSenha = 'hmac-sha256-iterativo-v1';
  usuario.atualizadoEm = new Date().toISOString();
  usuario.atualizadoPor = administrador.id;
  salvarUsuarios_(dados);
  invalidarSessoesUsuario_(usuario.id);
  registrarAuditoria_(administrador, 'redefinir_senha_usuario', { usuarioId: usuario.id, saram: usuario.saram });
  return { sucesso: true };
}

function excluirUsuario(usuarioId, token) {
  const administrador = exigirPerfil_(token, ['administrador']);
  const dados = lerUsuarios_();
  const indiceUsuario = dados.usuarios.findIndex(function(item) {
    return item.id === usuarioId;
  });

  if (indiceUsuario === -1) throw new Error('Usuário não encontrado.');

  const usuario = dados.usuarios[indiceUsuario];
  if (usuario.id === administrador.id) {
    throw new Error('Você não pode excluir o próprio usuário durante a sessão.');
  }

  const administradoresAtivos = dados.usuarios.filter(function(item) {
    return item.perfil === 'administrador' && item.ativo === true;
  });
  if (
    usuario.perfil === 'administrador' &&
    usuario.ativo === true &&
    administradoresAtivos.length <= 1
  ) {
    throw new Error('O último Administrador ativo não pode ser excluído.');
  }

  dados.usuarios.splice(indiceUsuario, 1);
  salvarUsuarios_(dados);
  invalidarSessoesUsuario_(usuario.id);
  registrarAuditoria_(administrador, 'excluir_usuario', {
    usuario: usuarioPublico_(usuario)
  });

  return { sucesso: true };
}


function recriarEstadoJson() {
  return inicializarBanco_();
}