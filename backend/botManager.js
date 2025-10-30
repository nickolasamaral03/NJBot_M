const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const empresaDB = require('./models/Empresa');

// ✅ CACHE GLOBAL MELHORADO
const bots = {};
const atendimentosManuais = {};
const qrCodesGerados = {};
const statusBots = {};
const instanciasAtivas = new Map();
const connectionStates = new Map();
const reconexoesPendentes = new Map();

async function limparSessaoEmpresa(empresaId) {
    const pastaBase = path.join(__dirname, 'bots', empresaId.toString());
    if (fs.existsSync(pastaBase)) {
        try {
            fs.rmSync(pastaBase, { recursive: true, force: true });
            console.log(`🧹 Sessão limpa para empresa ID: ${empresaId}`);
        } catch (error) {
            console.error(`❌ Erro ao limpar sessão: ${error}`);
        }
    }
}

function estaEmHorarioComercial(empresa) {
    const agora = new Date();
    const diaAtual = agora.getDay().toString();
    
    const horariosMap = empresa.horariosSemana || {};
    const configDia = horariosMap[diaAtual]; 
    
    if (!configDia || !configDia.ativo) return false;

    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const minutosAgora = horaAtual * 60 + minutoAtual;
    
    const [hInicio, mInicio] = (configDia.inicio || '09:00').split(':').map(Number);
    const [hIntervaloInicio, mIntervaloInicio] = (configDia.intervaloInicio || '12:00').split(':').map(Number);
    const [hIntervaloFim, mIntervaloFim] = (configDia.intervaloFim || '13:00').split(':').map(Number);
    const [hFim, mFim] = (configDia.fim || '18:00').split(':').map(Number);
    
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosIntervaloInicio = hIntervaloInicio * 60 + mIntervaloInicio;
    const minutosIntervaloFim = hIntervaloFim * 60 + mIntervaloFim;
    const minutosFim = hFim * 60 + mFim;

    const estaNoTurnoManha = (minutosAgora >= minutosInicio && minutosAgora < minutosIntervaloInicio);
    const estaNoTurnoTarde = (minutosAgora >= minutosIntervaloFim && minutosAgora < minutosFim);

    return estaNoTurnoManha || estaNoTurnoTarde;
}

// --- logger shim mínimo compatível com Baileys ---
const defaultLogger = {
  level: 'error',
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  fatal: (...args) => console.error(...args),
  child: function (meta = {}) {
    // Retorna o mesmo logger - simples e compatível com Baileys
    return this;
  }
};
// --------------------------------------------------

async function iniciarBot(empresa) {
    const empresaId = empresa._id.toString();
    
    // ✅ Evitar múltiplas instâncias com verificação mais robusta
    if (instanciasAtivas.has(empresaId)) {
        console.log(`⚠️ Já existe uma instância ativa para ${empresa.nome}`);
        return qrCodesGerados[empresaId] || null;
    }

    // ✅ Cancelar reconexões pendentes
    if (reconexoesPendentes.has(empresaId)) {
        clearTimeout(reconexoesPendentes.get(empresaId));
        reconexoesPendentes.delete(empresaId);
    }

    // ✅ Inicializar estado
    statusBots[empresaId] = false;
    connectionStates.set(empresaId, 'connecting');
    instanciasAtivas.set(empresaId, true);

    const pastaBase = path.join(__dirname, 'bots', empresaId); 
    const pasta = path.join(pastaBase, 'auth_info_baileys'); 

    if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true });
    }

    console.log(`🚀 Iniciando bot para: ${empresa.nome}`);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(pasta);
        const { version } = await fetchLatestBaileysVersion();

        let resolveQRCode;
        let rejectQRCode;
        
        // ✅ CORREÇÃO: Definir qrCodePromise ANTES de usar
        let qrCodePromise;
        let timeoutId;

        qrCodePromise = new Promise((resolve, reject) => { 
            resolveQRCode = resolve;
            rejectQRCode = reject;
            
            // ✅ Timeout de 25 segundos para QR Code
            timeoutId = setTimeout(() => {
                reject(new Error('QR Code timeout - servidor pode estar sobrecarregado'));
            }, 25000);
        });

        // ✅ Cleanup do timeout quando a promise for resolvida/rejeitada
        qrCodePromise.finally(() => {
            if (timeoutId) clearTimeout(timeoutId);
        });

        // ✅ CONFIGURAÇÃO OTIMIZADA COM LOGGER SHIM
        const sock = makeWASocket({
            version,
            auth: state,
            connectTimeoutMs: 60_000,
            keepAliveIntervalMs: 10_000,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            browser: ["Ubuntu", "Chrome", "22.04.4"],
            syncFullHistory: false,
            transactionOpts: {
                maxCommitRetries: 3,
                delayBetweenTriesMs: 1000
            },
            // ✅ CONFIGURAÇÕES PARA ESTABILIDADE
            retryRequestDelayMs: 1000,
            maxRetries: 3,
            fireInitQueries: true,
            emitOwnEvents: true,
            defaultQueryTimeoutMs: 60000,
            // ✅ CONFIGURAÇÃO DE WEBSOCKET MELHORADA
            wsOptions: {
                origin: "https://web.whatsapp.com",
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            },
            // ✅ LOGGING: usar shim compatível com .child()
            logger: defaultLogger
        });

        sock.ev.on('creds.update', saveCreds);

        // ✅ CONNECTION.UPDATE - LÓGICA ROBUSTA
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            console.log(`🔗 [${empresa.nome}] Estado: ${connection}`, qr ? 'QR Recebido' : '');

            // ✅ QR CODE - COM TRATAMENTO COMPLETO
            if (qr) {
                console.log(`📱 [${empresa.nome}] QR Code gerado`);
                try {
                    const qrCodeDataURL = await qrcode.toDataURL(qr);
                    qrCodesGerados[empresaId] = qrCodeDataURL;
                    statusBots[empresaId] = false;
                    connectionStates.set(empresaId, 'qr_waiting');
                    
                    if (resolveQRCode) {
                        console.log(`✅ [${empresa.nome}] QR Code processado e disponível`);
                        resolveQRCode(qrCodeDataURL);
                        resolveQRCode = null;
                        rejectQRCode = null;
                    }
                } catch (error) {
                    console.error(`❌ Erro ao gerar QR Code:`, error);
                    if (rejectQRCode) {
                        rejectQRCode(error);
                        resolveQRCode = null;
                        rejectQRCode = null;
                    }
                }
            }

            // ✅ CONEXÃO FECHADA - LÓGICA MELHORADA
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;

                console.log(`🔌 [${empresa.nome}] Conexão fechada. Status: ${statusCode}, Logged out: ${isLoggedOut}`);

                if (isLoggedOut) {
                    // ✅ LOGOUT MANUAL - limpar tudo
                    statusBots[empresaId] = false;
                    connectionStates.set(empresaId, 'logged_out');
                    instanciasAtivas.delete(empresaId);
                    delete bots[empresaId];
                    delete qrCodesGerados[empresaId];
                    
                    // Limpar sessão
                    await limparSessaoEmpresa(empresaId);
                    console.log(`🔴 [${empresa.nome}] Logged out - Sessão finalizada`);
                } else {
                    // ✅ OUTRAS DESCONEXÕES - tentar reconectar com backoff
                    statusBots[empresaId] = false;
                    connectionStates.set(empresaId, 'disconnected');
                    
                    const reconexaoId = setTimeout(async () => {
                        reconexoesPendentes.delete(empresaId);
                        if (empresa.botAtivo && !instanciasAtivas.has(empresaId)) {
                            try {
                                console.log(`🔄 [${empresa.nome}] Tentando reconectar...`);
                                await iniciarBot(empresa);
                            } catch (error) {
                                console.error(`❌ Erro na reconexão:`, error);
                            }
                        }
                    }, 5000);
                    
                    reconexoesPendentes.set(empresaId, reconexaoId);
                    console.log(`🟡 [${empresa.nome}] Tentando reconectar em 5 segundos...`);
                }
                
                // ✅ Resolver promise pendente em caso de falha
                if (rejectQRCode) {
                    rejectQRCode(new Error('Conexão fechada antes do QR Code'));
                    resolveQRCode = null;
                    rejectQRCode = null;
                }
                
                return;
            }

            // ✅ CONEXÃO ABERTA
            if (connection === 'open') {
                console.log(`✅ [${empresa.nome}] Conectado com sucesso!`);
                statusBots[empresaId] = true;
                connectionStates.set(empresaId, 'connected');
                delete qrCodesGerados[empresaId];
                bots[empresaId] = sock;
                
                // ✅ Limpar reconexão pendente se existir
                if (reconexoesPendentes.has(empresaId)) {
                    clearTimeout(reconexoesPendentes.get(empresaId));
                    reconexoesPendentes.delete(empresaId);
                }
                
                if (resolveQRCode) {
                    resolveQRCode(null);
                    resolveQRCode = null;
                    rejectQRCode = null;
                }
            }

            // ✅ CONECTANDO
            if (connection === 'connecting') {
                console.log(`🟡 [${empresa.nome}] Conectando...`);
                statusBots[empresaId] = false;
                connectionStates.set(empresaId, 'connecting');
            }
        });

        // ✅ HANDLER DE MENSAGENS MELHORADO
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages?.[0];
                if (!msg || msg.key.fromMe || !msg.message) return;

                const sender = msg.key.remoteJid;
                const texto = msg.message?.conversation || 
                             msg.message?.extendedTextMessage?.text || 
                             msg.message?.imageMessage?.caption || '';
                const textoLower = texto.toLowerCase().trim();

                // ✅ BUSCAR EMPRESA ATUALIZADA COM CACHE
                let empresaAtualizada;
                try {
                    empresaAtualizada = await empresaDB.findById(empresa._id);
                    if (!empresaAtualizada?.botAtivo) return;
                } catch (dbError) {
                    console.error(`❌ Erro ao buscar empresa:`, dbError);
                    return;
                }

                // ✅ VERIFICAR HORÁRIO COMERCIAL
                if (!estaEmHorarioComercial(empresaAtualizada)) {
                    const agora = new Date();
                    const chaveAtendimento = `${empresaAtualizada._id}_${sender}`;
                    
                    if (!atendimentosManuais[chaveAtendimento]) {
                        atendimentosManuais[chaveAtendimento] = {
                            msgFechadoEnviada: null
                        };
                    }
                    
                    const atendimento = atendimentosManuais[chaveAtendimento];
                    const minutosDesdeUltimoFechado = atendimento.msgFechadoEnviada 
                        ? (agora - atendimento.msgFechadoEnviada) / 1000 / 60 
                        : Infinity;
                    
                    if (minutosDesdeUltimoFechado > 20) {
                        const diaAtual = agora.getDay().toString();
                        const horariosMap = empresaAtualizada.horariosSemana || {};
                        const configDia = horariosMap[diaAtual] || {};

                        let msgFechado = empresaAtualizada.msgFechado || 
                                        'Olá! Nosso horário de atendimento é de [HORARIO_INICIO]h às [HORARIO_FIM]h. Retornaremos assim que possível.';
                        
                        msgFechado = msgFechado
                            .replace('[HORARIO_INICIO]', configDia.inicio || '00:00')
                            .replace('[HORARIO_FIM]', configDia.fim || '00:00');

                        await sock.sendMessage(sender, { text: msgFechado });
                        atendimento.msgFechadoEnviada = agora;
                    }
                    return;
                }

                // ✅ GERENCIAR ATENDIMENTOS
                const chaveAtendimento = `${empresaAtualizada._id}_${sender}`;
                if (!atendimentosManuais[chaveAtendimento]) {
                    atendimentosManuais[chaveAtendimento] = {
                        ativo: false,
                        iniciado: false,
                        ultimoContato: new Date()
                    };
                }
                
                const atendimento = atendimentosManuais[chaveAtendimento];
                atendimento.ultimoContato = new Date();

                if (atendimento.ativo) return;

                if (!atendimento.iniciado) {
                    const msgBoasVindas = empresaAtualizada.msgBoasVindas || 
                                         `Olá! Bem-vindo(a) ao ${empresaAtualizada.nome}!`;
                    await sock.sendMessage(sender, { text: msgBoasVindas });
                    atendimento.iniciado = true;
                    return;
                }

                let resposta = '';

                // ✅ RESPOSTAS AUTOMÁTICAS MELHORADAS
                if (textoLower.includes('tudo bem') || textoLower.includes('como vai')) {
                    resposta = `Estou ótimo, obrigado! E você? 😄`;
                }
                else if (textoLower.includes('horário') || textoLower.includes('funcionamento')) {
                    const diaAtual = new Date().getDay().toString();
                    const horariosMap = empresaAtualizada.horariosSemana || {};
                    const configDia = horariosMap[diaAtual] || {};
                    
                    if (configDia.ativo) {
                        resposta = `Nosso horário de funcionamento é das ${configDia.inicio} às ${configDia.fim}`;
                        if (configDia.intervaloInicio && configDia.intervaloFim) {
                            resposta += `, com intervalo das ${configDia.intervaloInicio} às ${configDia.intervaloFim}`;
                        }
                    } else {
                        resposta = `Hoje estamos fechados. Nosso horário normal é de segunda a sexta.`;
                    }
                }
                else if (textoLower.includes('obrigado') || textoLower.includes('obrigada')) {
                    resposta = `Por nada! 😊 Em que mais posso ajudar?`;
                }
                else if (textoLower.includes('#humano') || textoLower.includes('#atendente')) {
                    resposta = `🔔 Um atendente humano será contactado em breve. Aguarde um momento, por favor!`;
                    atendimento.ativo = true;
                }
                else if (textoLower.includes('#bot') || textoLower.includes('#voltar')) {
                    resposta = `🤖 Voltando para o atendimento automático. Como posso ajudar?`;
                    atendimento.ativo = false;
                }
                else {
                    try {
                        const { gerarRespostaGemini } = require('./gemini');
                        resposta = await gerarRespostaGemini(texto, empresaAtualizada.promptIA);
                    } catch (error) {
                        console.error('Erro Gemini:', error);
                        resposta = `Desculpe, não consegui processar sua mensagem no momento. Poderia reformular ou tentar novamente? 🤔`;
                    }
                }

                if (resposta) {
                    await sock.sendMessage(sender, { text: resposta });
                }

            } catch (err) {
                console.error(`❌ Erro no handler de mensagens:`, err);
            }
        });

        // ✅ AGUARDAR QR CODE COM TRATAMENTO DE ERRO
        try {
            const qrCodeBase64 = await qrCodePromise;
            console.log(`✅ [${empresa.nome}] Bot iniciado com sucesso`);
            return qrCodeBase64;
        } catch (error) {
            console.error(`❌ Timeout/Erro no QR Code para ${empresa.nome}:`, error.message);
            
            // ✅ Limpar recursos em caso de timeout
            if (bots[empresaId]) {
                try {
                    await bots[empresaId].end();
                } catch (endError) {
                    console.error(`❌ Erro ao encerrar bot:`, endError);
                }
            }
            
            instanciasAtivas.delete(empresaId);
            delete bots[empresaId];
            delete qrCodesGerados[empresaId];
            connectionStates.delete(empresaId);
            
            return null;
        }

    } catch (error) {
        console.error(`❌ Erro crítico em ${empresa.nome}:`, error);
        
        // ✅ LIMPEZA COMPLETA EM CASO DE ERRO
        instanciasAtivas.delete(empresaId);
        delete bots[empresaId];
        delete statusBots[empresaId];
        delete qrCodesGerados[empresaId];
        connectionStates.delete(empresaId);
        
        if (reconexoesPendentes.has(empresaId)) {
            clearTimeout(reconexoesPendentes.get(empresaId));
            reconexoesPendentes.delete(empresaId);
        }
        
        throw error;
    }
}

// ✅ FUNÇÕES AUXILIARES MELHORADAS
function getQRCode(empresaId) {
    return qrCodesGerados[empresaId] || null;
}

function getBotStatus(empresaId) {
    const estado = connectionStates.get(empresaId) || 'disconnected';
    const conectado = statusBots[empresaId] || false;
    const temQR = !!qrCodesGerados[empresaId];
    
    return {
        connected: conectado,
        state: estado,
        hasQR: temQR,
        instanciaAtiva: instanciasAtivas.has(empresaId)
    };
}

async function reiniciarBot(empresa) {
    const empresaId = empresa._id.toString();
    console.log(`🔄 Reiniciando bot: ${empresa.nome}`);

    // ✅ Cancelar reconexões pendentes
    if (reconexoesPendentes.has(empresaId)) {
        clearTimeout(reconexoesPendentes.get(empresaId));
        reconexoesPendentes.delete(empresaId);
    }

    // ✅ Parar instância atual
    if (bots[empresaId]) {
        try {
            await bots[empresaId].end();
            console.log(`✅ Bot ${empresa.nome} encerrado`);
        } catch (err) {
            console.error(`❌ Erro ao encerrar bot:`, err);
        }
    }

    // ✅ Limpar tudo
    await limparSessaoEmpresa(empresaId);
    instanciasAtivas.delete(empresaId);
    delete bots[empresaId];
    delete qrCodesGerados[empresaId];
    delete statusBots[empresaId];
    connectionStates.delete(empresaId);

    // ✅ Aguardar limpeza completa
    console.log(`⏳ Aguardando limpeza completa...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ✅ Reiniciar
    console.log(`🎯 Iniciando nova instância...`);
    return await iniciarBot(empresa);
}

async function toggleBot(empresa) {
    const empresaId = empresa._id.toString();
    console.log(`🔧 Alternando bot: ${empresa.botAtivo ? 'LIGAR' : 'DESLIGAR'}`);

    if (!empresa.botAtivo && bots[empresaId]) {
        // ✅ DESLIGAR BOT
        try {
            await bots[empresaId].end();
            delete bots[empresaId];
            instanciasAtivas.delete(empresaId);
            delete qrCodesGerados[empresaId];
            statusBots[empresaId] = false;
            connectionStates.set(empresaId, 'disabled');
            console.log(`✅ Bot ${empresa.nome} desligado`);
        } catch (err) {
            console.error(`❌ Erro ao desligar bot:`, err);
        }
    }

    if (empresa.botAtivo && !instanciasAtivas.has(empresaId)) {
        // ✅ LIGAR BOT
        try {
            await iniciarBot(empresa);
            console.log(`✅ Bot ${empresa.nome} ligado`);
        } catch (err) {
            console.error(`❌ Erro ao iniciar bot:`, err);
        }
    }
}

function deletarEmpresa(empresaId) {
    console.log(`🗑️ Excluindo bot ID: ${empresaId}`);

    // ✅ Cancelar reconexões pendentes
    if (reconexoesPendentes.has(empresaId)) {
        clearTimeout(reconexoesPendentes.get(empresaId));
        reconexoesPendentes.delete(empresaId);
    }

    // ✅ Limpar tudo
    delete qrCodesGerados[empresaId];

    if (bots[empresaId]) {
        try {
            bots[empresaId].end();
            console.log(`✅ Bot ${empresaId} encerrado`);
        } catch (err) {
            console.error(`❌ Erro ao encerrar bot:`, err);
        }
        delete bots[empresaId];
    }

    const authPath = path.join(__dirname, 'bots', empresaId); 
    if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log(`✅ Pasta do bot ${empresaId} removida`);
    }
    
    // ✅ Limpar atendimentos
    for (const chave in atendimentosManuais) {
        if (chave.startsWith(empresaId)) {
            delete atendimentosManuais[chave];
        }
    }
    
    instanciasAtivas.delete(empresaId);
    delete statusBots[empresaId];
    connectionStates.delete(empresaId);
    
    console.log(`✅ Bot ${empresaId} completamente removido`);
}

// ✅ CLEANUP DE ATENDIMENTOS INATIVOS MELHORADO
setInterval(() => { 
    const agora = new Date();
    let removidos = 0;
    
    for (const [chave, atendimento] of Object.entries(atendimentosManuais)) {
        if (atendimento.ultimoContato) {
            const minutosInatividade = (agora - new Date(atendimento.ultimoContato)) / 1000 / 60;
            
            if (minutosInatividade > 30) {
                delete atendimentosManuais[chave];
                removidos++;
            }
        }
    }
    
    if (removidos > 0) {
        console.log(`🧹 Limpeza: ${removidos} atendimentos inativos removidos`);
    }
}, 10 * 60 * 1000); // A cada 10 minutos

// ✅ EXPORTAÇÕES
module.exports = {
    limparSessaoEmpresa,
    iniciarBot,
    getQRCode,
    getBotStatus,
    reiniciarBot,
    toggleBot,
    deletarEmpresa,
    statusBots
};
