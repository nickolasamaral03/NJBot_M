const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const empresaDB = require('./models/Empresa');

// ✅ CACHE GLOBAL - LÓGICA SIMPLES
const bots = {};
const atendimentosManuais = {};
const qrCodesGerados = {};
const statusBots = {}; // { empresaId: boolean } - true = conectado, false = SOMENTE logged out
const instanciasAtivas = new Map();

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
    
    const horariosMap = empresa.horariosSemana || new Map();
    const configDia = horariosMap.get ? horariosMap.get(diaAtual) : horariosMap[diaAtual]; 
    
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

async function iniciarBot(empresa) {
    const empresaId = empresa._id.toString();
    
    if (instanciasAtivas.has(empresaId)) {
        console.log(`⚠️ Já existe uma instância ativa para ${empresa.nome}`);
        return null;
    }

    // ✅ INICIALIZAR COMO CONECTADO (assume que vai conectar)
    statusBots[empresaId] = true;

    const pastaBase = path.join(__dirname, 'bots', empresaId); 
    const pasta = path.join(pastaBase, 'auth_info_baileys'); 

    if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true });
    }

    instanciasAtivas.set(empresaId, true);
    console.log(`🚀 Iniciando bot para: ${empresa.nome}`);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(pasta);
        const { version } = await fetchLatestBaileysVersion();

        let resolveQRCode;
        const qrCodePromise = new Promise(resolve => { 
            resolveQRCode = resolve; 
        });

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
            connectTimeoutMs: 60_000,
            keepAliveIntervalMs: 10_000,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            browser: ["Ubuntu", "Chrome", "22.04.4"],
        });

        sock.ev.on('creds.update', saveCreds);

        // ✅ CONNECTION.UPDATE - LÓGICA SUPER SIMPLES
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // ✅ QR CODE - MANTÉM COMO CONECTADO (não é logged out)
            if (qr) {
                console.log(`📱 [${empresa.nome}] QR Code gerado`);
                try {
                    const qrCodeDataURL = await qrcode.toDataURL(qr);
                    qrCodesGerados[empresaId] = qrCodeDataURL;
                    
                    // ✅ NÃO ALTERA STATUS - continua como conectado
                    // statusBots[empresaId] = true; // Mantém conectado
                    
                    if (resolveQRCode) resolveQRCode(qrCodeDataURL);
                } catch (error) {
                    console.error(`❌ Erro ao gerar QR Code:`, error);
                }
            }

            // ✅ CONEXÃO FECHADA - SÓ MARCA DESCONECTADO SE FOR LOGGED OUT
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;

                console.log(`🔌 [${empresa.nome}] Conexão fechada. Logged out: ${isLoggedOut}`);

                // ✅ SÓ MARCA COMO DESCONECTADO SE FOR LOGOUT MANUAL
                if (isLoggedOut) {
                    statusBots[empresaId] = false; // 🔴 SÓ AQUI FICA VERMELHO
                    instanciasAtivas.delete(empresaId);
                    delete bots[empresaId];
                    console.log(`🔴 [${empresa.nome}] Logged out - DESCONECTADO`);
                } else {
                    // ✅ QUALQUER OUTRA DESCONEXÃO MANTÉM COMO CONECTADO 🟢
                    console.log(`🟡 [${empresa.nome}] Reconexão automática - mantendo CONECTADO`);
                    statusBots[empresaId] = true; // Garante que continua conectado
                }

                // ✅ TENTA RECONECTAR SE NÃO FOI LOGOUT
                if (!isLoggedOut && empresa.botAtivo) {
                    console.log(`🔄 [${empresa.nome}] Reconectando em 5 segundos...`);
                    setTimeout(() => {
                        if (empresa.botAtivo && !instanciasAtivas.has(empresaId)) {
                            iniciarBot(empresa);
                        }
                    }, 5000);
                }
                return;
            }

            // ✅ CONEXÃO ABERTA - CONFIRMA COMO CONECTADO
            if (connection === 'open') {
                console.log(`✅ [${empresa.nome}] Conectado com sucesso!`);
                statusBots[empresaId] = true; // 🟢 CONECTADO
                delete qrCodesGerados[empresaId];
                bots[empresaId] = sock;
                
                if (resolveQRCode) resolveQRCode = null;
            }

            // ✅ CONNECTING - MANTÉM COMO CONECTADO
            if (connection === 'connecting') {
                console.log(`🟡 [${empresa.nome}] Conectando...`);
                statusBots[empresaId] = true; // Mantém como conectado
            }
        });

        // ✅ HANDLER DE MENSAGENS
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages?.[0];
                if (!msg || msg.key.fromMe) return;

                const sender = msg.key.remoteJid;
                const texto = msg.message?.conversation || '';
                const textoLower = texto.toLowerCase().trim();

                // ✅ BUSCAR EMPRESA ATUALIZADA
                const empresaAtualizada = await empresaDB.findById(empresa._id);
                if (!empresaAtualizada?.botAtivo) return;

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
                        const horariosMap = empresaAtualizada.horariosSemana || new Map();
                        const configDia = horariosMap.get ? horariosMap.get(diaAtual) : horariosMap[diaAtual] || {};

                        const msgFechado = empresaAtualizada.msgFechado
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
                        iniciado: false
                    };
                }
                
                const atendimento = atendimentosManuais[chaveAtendimento];

                if (atendimento.ativo) return;

                if (!atendimento.iniciado) {
                    const msgBoasVindas = empresaAtualizada.msgBoasVindas || `Olá! Bem-vindo(a) ao ${empresaAtualizada.nome}!`;
                    await sock.sendMessage(sender, { text: msgBoasVindas });
                    atendimento.iniciado = true;
                    return;
                }

                let resposta = '';

                if (textoLower.includes('tudo bem') || textoLower.includes('como vai')) {
                    resposta = `Estou ótimo, obrigado! E você? 😄`;
                }
                else if (textoLower.includes('horário') || textoLower.includes('funcionamento')) {
                    const diaAtual = new Date().getDay().toString();
                    const horariosMap = empresaAtualizada.horariosSemana || new Map();
                    const configDia = horariosMap.get ? horariosMap.get(diaAtual) : horariosMap[diaAtual] || {};
                    
                    if (configDia.ativo) {
                        resposta = `Horário: ${configDia.inicio} às ${configDia.fim}`;
                        if (configDia.intervaloInicio && configDia.intervaloFim) {
                            resposta += ` (intervalo ${configDia.intervaloInicio}-${configDia.intervaloFim})`;
                        }
                    } else {
                        resposta = `Hoje estamos fechados.`;
                    }
                }
                else if (textoLower.includes('obrigado') || textoLower.includes('obrigada')) {
                    resposta = `Por nada! 😊`;
                }
                else if (textoLower.includes('#humano') || textoLower.includes('#atendente')) {
                    resposta = `🔔 Chamando atendente humano...`;
                    atendimento.ativo = true;
                }
                else if (textoLower.includes('#bot') || textoLower.includes('#voltar')) {
                    resposta = `🤖 Voltando para atendimento automático.`;
                    atendimento.ativo = false;
                }
                else {
                    try {
                        const { gerarRespostaGemini } = require('./gemini');
                        resposta = await gerarRespostaGemini(texto, empresaAtualizada.promptIA);
                    } catch (error) {
                        resposta = `Desculpe, não entendi. Poderia reformular? 🤔`;
                    }
                }

                if (resposta) {
                    await sock.sendMessage(sender, { text: resposta });
                }

            } catch (err) {
                console.error(`❌ Erro:`, err);
            }
        });

        const qrCodeBase64 = await qrCodePromise; 
        return qrCodeBase64;

    } catch (error) {
        console.error(`❌ Erro crítico:`, error);
        instanciasAtivas.delete(empresaId);
        delete bots[empresaId];
        delete statusBots[empresaId];
        throw error;
    }
}

// ✅ FUNÇÕES AUXILIARES
function getQRCode(empresaId) {
    return qrCodesGerados[empresaId] || null;
}

async function reiniciarBot(empresa) {
    const empresaId = empresa._id.toString();
    console.log(`🔄 Reiniciando bot: ${empresa.nome}`);

    await limparSessaoEmpresa(empresaId);
    instanciasAtivas.delete(empresaId);

    if (bots[empresaId]) {
        try {
            await bots[empresaId].end();
        } catch (err) {
            console.error(`❌ Erro ao encerrar bot:`, err);
        }
        delete bots[empresaId];
    }

    delete qrCodesGerados[empresaId];
    await new Promise(resolve => setTimeout(resolve, 2000));

    return iniciarBot(empresa);
}

async function toggleBot(empresa) {
    const empresaId = empresa._id.toString();
    console.log(`🔧 Alternando bot: ${empresa.botAtivo ? 'LIGAR' : 'DESLIGAR'}`);

    if (!empresa.botAtivo && bots[empresaId]) {
        try {
            await bots[empresaId].end();
            delete bots[empresaId];
            instanciasAtivas.delete(empresaId);
        } catch (err) {
            console.error(`❌ Erro ao desligar bot:`, err);
        }
        delete qrCodesGerados[empresaId];
    }

    if (empresa.botAtivo && !instanciasAtivas.has(empresaId)) {
        try {
            await iniciarBot(empresa);
        } catch (err) {
            console.error(`❌ Erro ao iniciar bot:`, err);
        }
    }
}

function deletarEmpresa(empresaId) {
    console.log(`🗑️ Excluindo bot ID: ${empresaId}`);

    delete qrCodesGerados[empresaId];

    if (bots[empresaId]) {
        try {
            bots[empresaId].end();
        } catch (err) {
            console.error(`❌ Erro ao encerrar bot:`, err);
        }
        delete bots[empresaId];
    }

    const authPath = path.join(__dirname, 'bots', empresaId); 
    if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
    }
    
    for (const chave in atendimentosManuais) {
        if (chave.startsWith(empresaId)) {
            delete atendimentosManuais[chave];
        }
    }
    
    instanciasAtivas.delete(empresaId);
    delete statusBots[empresaId];
}

setInterval(() => { 
    const agora = new Date();
    
    for (const [chave, atendimento] of Object.entries(atendimentosManuais)) {
        if (atendimento.ativo && atendimento.ultimoContato) {
            const minutosInatividade = (agora - new Date(atendimento.ultimoContato)) / 1000 / 60;
            const [empresaId, sender] = chave.split('_');
            
            if (minutosInatividade > 10) {
                const sock = bots[empresaId];
                if (sock) {
                    sock.sendMessage(sender, {
                        text: `⏰ Voltando para atendimento automático.`
                    });
                }
                atendimento.ativo = false;
            }
        }
    }
}, 60 * 1000);

module.exports = {
    limparSessaoEmpresa,
    iniciarBot,
    getQRCode,
    reiniciarBot,
    toggleBot,
    deletarEmpresa,
    statusBots
};