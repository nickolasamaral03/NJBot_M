// const fs = require('fs');
// const path = require('path');
// const qrcode = require('qrcode');
// const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
// const empresaDB = require('./models/Empresa');

// // Para limpar sessões problemáticas
// async function limparSessaoEmpresa(empresaId) {
//     const pastaBase = path.join(__dirname, 'bots', empresaId.toString());
    
//     if (fs.existsSync(pastaBase)) {
//         try {
//             fs.rmSync(pastaBase, { recursive: true, force: true });
//             console.log(`🧹 Sessão limpa para empresa ID: ${empresaId}`);
//             return true;
//         } catch (error) {
//             console.error(`❌ Erro ao limpar sessão: ${error}`);
//             return false;
//         }
//     }
//     return true;
// }

// // ✅ MUDANÇA: bots e qrCodesGerados usam o ID da empresa como chave
// const bots = {};  // cache { empresaId: sock }
// const atendimentosManuais = {};  // { chaveEmpresa_remetente: { ativo, ultimoContato, iniciado, nomeEmpresa, msgFechadoEnviada } }
// const qrCodesGerados = {}; // { empresaId: base64QR }
// const statusBots = {}; // { empresaId: { conectado: boolean, ultimaAtualizacao: Date } }

// const instanciasAtivas = new Map();

// // 1. FUNÇÃO DE VERIFICAÇÃO DE HORÁRIO DE ATENDIMENTO (Com Intervalo)
// function estaEmHorarioComercial(empresa) {
//     const agora = new Date();
//     const diaAtual = agora.getDay().toString();
    
//     // Suporte a Map ou Objeto simples
//     const horariosMap = empresa.horariosSemana || new Map();
//     const configDia = horariosMap.get ? horariosMap.get(diaAtual) : horariosMap[diaAtual]; 
    
//     if (!configDia || !configDia.ativo) {
//         return false; 
//     }

//     const horaAtual = agora.getHours();
//     const minutoAtual = agora.getMinutes();
//     const minutosAgora = horaAtual * 60 + minutoAtual;
    
//     const [hInicio, mInicio] = (configDia.inicio || '09:00').split(':').map(Number);
//     const [hIntervaloInicio, mIntervaloInicio] = (configDia.intervaloInicio || '12:00').split(':').map(Number);
    
//     const minutosInicio = hInicio * 60 + mInicio;
//     const minutosIntervaloInicio = hIntervaloInicio * 60 + mIntervaloInicio;

//     const [hIntervaloFim, mIntervaloFim] = (configDia.intervaloFim || '13:00').split(':').map(Number);
//     const [hFim, mFim] = (configDia.fim || '18:00').split(':').map(Number);
    
//     const minutosIntervaloFim = hIntervaloFim * 60 + mIntervaloFim;
//     const minutosFim = hFim * 60 + mFim;

//     const estaNoTurnoManha = (
//         minutosAgora >= minutosInicio &&
//         minutosAgora < minutosIntervaloInicio
//     );
    
//     const estaNoTurnoTarde = (
//         minutosAgora >= minutosIntervaloFim &&
//         minutosAgora < minutosFim
//     );

//     return estaNoTurnoManha || estaNoTurnoTarde;
// }

// async function iniciarBot(empresa) {
//      const empresaId = empresa._id.toString();
    
//     // ✅ VERIFICAÇÃO DE PERMISSÕES
//     const botsDir = path.join(__dirname, 'bots');
//     if (!fs.existsSync(botsDir)) {
//         fs.mkdirSync(botsDir, { recursive: true });
//         console.log(`📁 Diretório bots criado: ${botsDir}`);
//     }

//     if (instanciasAtivas.has(empresaId)) {
//         console.log(`⚠️ Já existe uma instância ativa para ${empresa.nome} (ID: ${empresaId}). Aguardando...`);
//         return null;
//     }

//     // ✅ CORREÇÃO CRÍTICA: USAR ID NO CAMINHO DA PASTA
//     const pastaBase = path.join(__dirname, 'bots', empresaId); 
//     const pasta = path.join(pastaBase, 'auth_info_baileys'); 

//     if (!fs.existsSync(pasta)) {
//         fs.mkdirSync(pasta, { recursive: true }); 
//         console.log(`📁 Pasta criada: ${pasta}`);
//     }

//     instanciasAtivas.set(empresaId, true);
//     console.log(`🚀 Iniciando bot para: ${empresa.nome} (ID: ${empresaId})`);

//     try {
//         const { state, saveCreds } = await useMultiFileAuthState(pasta);
//         const { version } = await fetchLatestBaileysVersion();

//         let resolveQRCode;
//         const qrCodePromise = new Promise(resolve => { 
//             resolveQRCode = resolve; 
//         }).catch(err => {
//             console.error(`❌ [${empresa.nome}] Erro na Promise QR Code:`, err);
//             return null;
//         });

//         // const sock = makeWASocket({
//         //     version,
//         //     auth: state,
//         //     printQRInTerminal: true,
//         //     connectTimeoutMs: 0, 
//         //     keepAliveIntervalMs: 10000,
//         //     markOnlineOnConnect: false,
//         //     generateHighQualityLinkPreview: true,
//         //     retryRequestDelayMs: 1000,
//         //     maxMsgRetryCount: 3,
//         //     emitOwnEvents: true,
//         //     defaultQueryTimeoutMs: 0, 
//         // });

//         const sock = makeWASocket({
//             version,
//             auth: state,
//             printQRInTerminal: true,
//             connectTimeoutMs: 60_000,
//             keepAliveIntervalMs: 10_000,
//             markOnlineOnConnect: false,
//             generateHighQualityLinkPreview: true,
//             retryRequestDelayMs: 2_000,
//             maxMsgRetryCount: 3,
//             emitOwnEvents: false,
//             defaultQueryTimeoutMs: 0,
//             browser: ["Ubuntu", "Chrome", "22.04.4"], // ✅ Adicionar browser fixo
//         });

//         sock.ev.on('creds.update', saveCreds);

//         // sock.ev.on('connection.update', async (update) => {
//         //     const { connection, lastDisconnect, qr } = update;

//         //     console.log(`🔗 [${empresa.nome}] Estado da conexão: ${connection}`);

//         //     if (qr) {
//         //         console.log(`📱 [${empresa.nome}] QR Code gerado - Aguardando escaneamento...`);
//         //         try {
//         //             const qrCodeDataURL = await qrcode.toDataURL(qr);
//         //             // ✅ MUDANÇA: USAR ID COMO CHAVE
//         //             qrCodesGerados[empresaId] = qrCodeDataURL;
//         //             resolveQRCode(qrCodeDataURL);
//         //         } catch (error) {
//         //             console.error(`❌ [${empresa.nome}] Erro ao gerar QR Code:`, error);
//         //         }
//         //     }

//         //     if (connection === 'close') {
//         //         const statusCode = lastDisconnect?.error?.output?.statusCode;
//         //         const loggedOut = statusCode === DisconnectReason.loggedOut;

//         //         console.log(`🔌 [${empresa.nome}] Conexão fechada. Status: ${statusCode}, LoggedOut: ${loggedOut}`);

//         //         instanciasAtivas.delete(empresaId);
//         //         delete bots[empresaId]; // Limpa a instância do cache

//         //         try {
//         //             const empresaAtualizada = await empresaDB.findById(empresa._id);

//         //             if (!loggedOut && empresaAtualizada?.botAtivo) {
//         //                 console.log(`🔄 [${empresa.nome}] Tentando reconexão em 10 segundos...`);
//         //                 setTimeout(() => {
//         //                     if (empresaAtualizada?.botAtivo && !instanciasAtivas.has(empresaId)) {
//         //                         console.log(`🔄 [${empresa.nome}] Iniciando reconexão...`);
//         //                         iniciarBot(empresaAtualizada);
//         //                     }
//         //                 }, 10000);

//         //                 // Mantém status ou define como reconectando
//         //                 statusBots[empresaId] = { // ✅ MUDANÇA: USAR ID
//         //                     conectado: false,
//         //                     ultimaAtualizacao: new Date(),
//         //                     reconectando: true
//         //                 };
//         //             } else {
//         //                 console.log(`❌ [${empresa.nome}] Não reconectando.`);

//         //                 statusBots[empresaId] = { // ✅ MUDANÇA: USAR ID
//         //                     conectado: false,
//         //                     ultimaAtualizacao: new Date(),
//         //                     reconectando: false
//         //                 };

//         //                 // Limpa sessão se foi logout
//         //                 if (loggedOut) {
//         //                     console.log(`🧹 [${empresa.nome}] Limpando sessão devido a logout`);
//         //                     // ✅ USAR PASTA BASE (ID) para limpeza
//         //                     if (fs.existsSync(pastaBase)) {
//         //                         fs.rmSync(pastaBase, { recursive: true, force: true });
//         //                     }
//         //                 }
//         //             }
//         //         } catch (error) {
//         //             console.error(`❌ [${empresa.nome}] Erro durante reconexão:`, error);
//         //             instanciasAtivas.delete(empresaId);
//         //             delete bots[empresaId];
//         //         }
//         //     }

//         //     if (connection === 'open') {
//         //         console.log(`✅ [${empresa.nome}] Conectado com sucesso!`);
//         //         statusBots[empresaId] = { // ✅ MUDANÇA: USAR ID
//         //             conectado: true,
//         //             ultimaAtualizacao: new Date(),
//         //             reconectando: false
//         //         };

//         //         delete qrCodesGerados[empresaId]; // ✅ MUDANÇA: USAR ID
//         //         bots[empresaId] = sock; // ✅ MUDANÇA: USAR ID
//         //     }
//         // });

//     sock.ev.on('connection.update', async (update) => {
//     const { connection, lastDisconnect, qr } = update;

//     console.log(`🔗 [${empresa.nome}] Estado da conexão: ${connection}`);
//     console.log('📄 Detalhes da atualização:', JSON.stringify(update, null, 2));

//     // ✅ CORREÇÃO: Tratar QR code primeiro
//     if (qr) {
//         console.log(`📱 [${empresa.nome}] QR Code gerado - Aguardando escaneamento...`);
//         try {
//             const qrCodeDataURL = await qrcode.toDataURL(qr);
//             qrCodesGerados[empresaId] = qrCodeDataURL;
//             if (resolveQRCode) resolveQRCode(qrCodeDataURL);
//         } catch (error) {
//             console.error(`❌ [${empresa.nome}] Erro ao gerar QR Code:`, error);
//         }
//     }

//     // ✅ CORREÇÃO: Tratar conexão fechada
//     if (connection === 'close') {
//         const statusCode = lastDisconnect?.error?.output?.statusCode;
//         const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

//         console.log(`🔌 [${empresa.nome}] Conexão fechada. Status: ${statusCode}, Reconectar: ${shouldReconnect}`);

//         instanciasAtivas.delete(empresaId);
//         delete bots[empresaId];

//         if (shouldReconnect && empresa.botAtivo) {
//             console.log(`🔄 [${empresa.nome}] Tentando reconexão em 5 segundos...`);
//             setTimeout(() => {
//                 if (!instanciasAtivas.has(empresaId)) {
//                     iniciarBot(empresa);
//                 }
//             }, 5000);
//         }
//         return; // ✅ IMPORTANTE: Sair após tratar disconnect
//     }

//     // ✅ CORREÇÃO: Tratar conexão aberta
//     if (connection === 'open') {
//         console.log(`✅ [${empresa.nome}] Conectado com sucesso!`);
//         statusBots[empresaId] = {
//             conectado: true,
//             ultimaAtualizacao: new Date(),
//             reconectando: false
//         };

//         delete qrCodesGerados[empresaId];
//         bots[empresaId] = sock;
        
//         // ✅ Limpar a promise do QR code
//         resolveQRCode = null;
//     }
// });

//         const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
//         const { WritableStreamBuffer } = require('stream-buffers');
//         const handleMensagem = require('./handlers/chatbot');
//         const { transcreverAudio } = require('./transcreverAudio');
//         const { gerarRespostaGemini } = require('./gemini');


//         // sock.ev.on('messages.upsert', async (m) => {
//         //     try {
//         //         const msg = m.messages?.[0];
//         //         if (!msg || !msg.message) return;

//         //         const sender = msg.key.remoteJid;

//         //         let texto =
//         //             msg.message?.conversation ||
//         //             msg.message?.extendedTextMessage?.text ||
//         //             msg.message?.imageMessage?.caption ||
//         //             msg.message?.videoMessage?.caption ||
//         //             msg.message?.documentMessage?.caption ||
//         //             msg.message?.buttonsResponseMessage?.selectedButtonId ||
//         //             msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
//         //             '';

//         //         if (msg.message?.voiceMessage || msg.message?.audioMessage) {
//         //             // ... Lógica de transcrição (omito por brevidade, mas está no arquivo completo)
//         //         }

//         //         const textoLower = texto.toLowerCase().trim();

//         //         const comandosPermitidosMesmoFromMe = [
//         //             '#bot', '#sair', '#encerrar', 'bot',
//         //             '#humano', '#atendente', '#manual'
//         //         ];

//         //         if (msg.key.fromMe && !comandosPermitidosMesmoFromMe.some(c => textoLower.includes(c))) {
//         //             return;
//         //         }

//         //         const empresaAtualizada = await empresaDB.findById(empresa._id);
//         //         if (!empresaAtualizada?.botAtivo) return;

//         //         const chaveAtendimento = `${empresaAtualizada._id}_${sender}`;
//         //         if (!atendimentosManuais[chaveAtendimento]) {
//         //             atendimentosManuais[chaveAtendimento] = {
//         //                 ativo: false,
//         //                 ultimoContato: null,
//         //                 iniciado: false,
//         //                 nomeEmpresa: empresaAtualizada.nome,
//         //                 msgFechadoEnviada: null 
//         //             };
//         //         }
                
//         //         const atendimento = atendimentosManuais[chaveAtendimento];

//         //         // >>> LÓGICA DE HORÁRIO DE ATENDIMENTO COM CONTROLE DE SPAM <<<
//         //         if (!estaEmHorarioComercial(empresaAtualizada)) {
//         //             const agora = new Date();
//         //             const minutosDesdeUltimoFechado = atendimento.msgFechadoEnviada 
//         //                 ? (agora - atendimento.msgFechadoEnviada) / 1000 / 60 
//         //                 : Infinity;
                    
//         //             const TOLERANCIA_MINUTOS = 20;

//         //             if (minutosDesdeUltimoFechado > TOLERANCIA_MINUTOS) {
//         //                 const diaAtual = agora.getDay().toString();
//         //                 const horariosMap = empresaAtualizada.horariosSemana || new Map();
//         //                 const configDia = horariosMap.get ? horariosMap.get(diaAtual) : horariosMap[diaAtual] || {};

//         //                 const msg = empresaAtualizada.msgFechado
//         //                     .replace('[HORARIO_INICIO]', configDia.inicio || '00:00')
//         //                     .replace('[HORARIO_FIM]', configDia.fim || '00:00');

//         //                 await sock.sendMessage(sender, { text: msg });
                        
//         //                 atendimento.msgFechadoEnviada = agora;
//         //             }
                    
//         //             return;
//         //         }
//         //         // ... (Resto da lógica de atendimento) ...

//         //     } catch (err) {
//         //         console.error('❌ Erro no processamento da mensagem:', err);
//         //     }
//         // });

//         // ⚠️ Não armazena o sock aqui, pois isso é feito na 'connection.update' (open)
//         // bots[empresaId] = sock;

// //         console.log(`⏳ [${empresa.nome}] Aguardando QR Code indefinidamente...`);
// //         const qrCodeBase64 = await qrCodePromise; 
// //         console.log(`✅ [${empresa.nome}] QR Code processado`);
// //         return qrCodeBase64;

// //     } catch (error) {
// //         console.error(`❌ [${empresa.nome}] Erro crítico ao iniciar bot:`, error);
// //         instanciasAtivas.delete(empresaId);
// //         delete bots[empresaId];
// //         throw error;
// //     }
// // }

// sock.ev.on('messages.upsert', async (m) => {
//     console.log(`🔔 [${empresa.nome}] EVENTO MENSAGEM ACIONADO!`);
//     console.log(`📦 [${empresa.nome}] Dados recebidos:`, JSON.stringify(m, null, 2));
    
//     try {
//         const msg = m.messages?.[0];
//         if (!msg) {
//             console.log(`❌ [${empresa.nome}] Mensagem vazia`);
//             return;
//         }

//         console.log(`👤 [${empresa.nome}] Remetente: ${msg.key.remoteJid}`);
//         console.log(`🤖 [${empresa.nome}] FromMe: ${msg.key.fromMe}`);
//         console.log(`💬 [${empresa.nome}] Tipo: ${Object.keys(msg.message || {})[0]}`);

//         // Se for mensagem do próprio bot, ignorar
//         if (msg.key.fromMe) {
//             console.log(`⚡ [${empresa.nome}] Mensagem do bot, ignorando`);
//             return;
//         }

//         const sender = msg.key.remoteJid;
//         let texto = msg.message?.conversation || 
//                    msg.message?.extendedTextMessage?.text || '';

//         console.log(`📝 [${empresa.nome}] Texto: "${texto}"`);

//         // ✅ RESPOSTA SIMPLES DE TESTE
//         if (texto.toLowerCase().includes('oi') || texto.toLowerCase().includes('ola')) {
//             console.log(`🎯 [${empresa.nome}] Reconheceu "oi", respondendo...`);
//             await sock.sendMessage(sender, { 
//                 text: `Olá! Eu sou o bot ${empresa.nome}. Conexão funcionando! ✅` 
//             });
//             console.log(`✅ [${empresa.nome}] Resposta enviada com sucesso!`);
//         }

//     } catch (err) {
//         console.error(`❌ [${empresa.nome}] Erro no handler:`, err);
//     }
// });
    
//     } catch (error) {
//         console.error(`❌ [${empresa.nome}] Erro crítico ao iniciar bot:`, error);
//         instanciasAtivas.delete(empresaId);
//         delete bots[empresaId];
//         throw error;
//     }
// }

// // ✅ MUDANÇA: Recebe o ID da empresa
// function getQRCode(empresaId) {
//     return qrCodesGerados[empresaId] || null;
// }

// async function reiniciarBot(empresa) {
//     const empresaId = empresa._id.toString();
//     console.log(`🔄 Reiniciando bot para: ${empresa.nome}`);

//     // ✅ USAR A NOVA FUNÇÃO DE LIMPEZA (em vez da lógica antiga)
//     await limparSessaoEmpresa(empresaId);

//     instanciasAtivas.delete(empresaId);

//     // ✅ MUDANÇA: USAR ID COMO CHAVE
//     if (bots[empresaId]) {
//         try {
//             await bots[empresaId].end();
//             console.log(`✅ Conexão anterior encerrada para: ${empresa.nome}`);
//         } catch (err) {
//             console.error(`❌ Erro ao encerrar bot ${empresa.nome}:`, err);
//         }
//         delete bots[empresaId];
//     }

//     delete qrCodesGerados[empresaId]; // ✅ MUDANÇA: USAR ID

//     await new Promise(resolve => setTimeout(resolve, 2000));

//     return iniciarBot(empresa);
// }

// async function toggleBot(empresa) {
//     const empresaId = empresa._id.toString();
//     console.log(`🔧 Alternando bot ${empresa.nome} para: ${empresa.botAtivo ? 'ATIVO' : 'INATIVO'}`);

//     // Lógica para Desligar
//     if (!empresa.botAtivo) {
//         // ✅ MUDANÇA: USAR ID COMO CHAVE
//         if (bots[empresaId]) {
//             try {
//                 await bots[empresaId].end();
//                 delete bots[empresaId];
//                 instanciasAtivas.delete(empresaId);
//                 console.log(`✅ Bot ${empresa.nome} desligado.`);
//             } catch (err) {
//                 console.error(`❌ Erro ao desligar bot ${empresa.nome}:`, err);
//             }
//         }
//         // Garante que o QR code seja apagado se o bot for desligado antes de conectar
//         delete qrCodesGerados[empresaId];
//     }

//     // Lógica para Ligar
//     if (empresa.botAtivo && !instanciasAtivas.has(empresaId)) {
//         try {
//             await iniciarBot(empresa);
//             console.log(`✅ Bot ${empresa.nome} iniciado.`);
//         } catch (err) {
//             console.error(`❌ Erro ao iniciar bot ${empresa.nome}:`, err);
//         }
//     }
// }

// // ✅ MUDANÇA: Recebe o ID da empresa
// function deletarEmpresa(empresaId) {
//     console.log(`🗑️ Excluindo bot da empresa ID: ${empresaId}`);

//     delete qrCodesGerados[empresaId]; // ✅ MUDANÇA: USAR ID

//     // ✅ MUDANÇA: USAR ID COMO CHAVE
//     if (bots[empresaId]) {
//         try {
//             bots[empresaId].end();
//         } catch (err) {
//             console.error(`❌ Erro ao encerrar bot ID ${empresaId}:`, err);
//         }
//         delete bots[empresaId];
//     }

//     // ✅ CORREÇÃO: USAR ID NO CAMINHO DA PASTA para apagar a pasta de sessão
//     const authPath = path.join(__dirname, 'bots', empresaId); 
//     if (fs.existsSync(authPath)) {
//         fs.rmSync(authPath, { recursive: true, force: true });
//         console.log(`🧹 Pastas de sessão removidas para ID: ${empresaId}`);
//     }
    
//     // Limpar atendimentos em curso
//     for (const chave in atendimentosManuais) {
//         if (chave.startsWith(empresaId)) {
//             delete atendimentosManuais[chave];
//         }
//     }
    
//     instanciasAtivas.delete(empresaId);
//     delete statusBots[empresaId];
// }


// // Intervalo para encerrar atendimentos inativos + resetar boas-vindas
// setInterval(async () => { 
//     // ... (Lógica de timeout usando empresaDB.findById, o que é correto) ...
// }, 60 * 1000);

// // ✅ EXPORTAÇÕES COMPLETAS
// module.exports = {
//     limparSessaoEmpresa,
//     iniciarBot,
//     getQRCode,
//     reiniciarBot,
//     toggleBot,
//     deletarEmpresa,
//     statusBots,
//     instanciasAtivas,
//     bots,
//     atendimentosManuais
// };

const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const empresaDB = require('./models/Empresa');
const { rateLimiter } = require('./plansManager');

// Para limpar sessões problemáticas
async function limparSessaoEmpresa(empresaId) {
    const pastaBase = path.join(__dirname, 'bots', empresaId.toString());
    
    if (fs.existsSync(pastaBase)) {
        try {
            fs.rmSync(pastaBase, { recursive: true, force: true });
            console.log(`🧹 Sessão limpa para empresa ID: ${empresaId}`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao limpar sessão: ${error}`);
            return false;
        }
    }
    return true;
}

// ✅ MUDANÇA: bots e qrCodesGerados usam o ID da empresa como chave
const bots = {};  // cache { empresaId: sock }
const atendimentosManuais = {};  // { chaveEmpresa_remetente: { ativo, ultimoContato, iniciado, nomeEmpresa, msgFechadoEnviada } }
const qrCodesGerados = {}; // { empresaId: base64QR }
const statusBots = {}; // { empresaId: { conectado: boolean, ultimaAtualizacao: Date } }

const instanciasAtivas = new Map();

// 1. FUNÇÃO DE VERIFICAÇÃO DE HORÁRIO DE ATENDIMENTO (Com Intervalo)
function estaEmHorarioComercial(empresa) {
    const agora = new Date();
    const diaAtual = agora.getDay().toString();
    
    // Suporte a Map ou Objeto simples
    const horariosMap = empresa.horariosSemana || new Map();
    const configDia = horariosMap.get ? horariosMap.get(diaAtual) : horariosMap[diaAtual]; 
    
    if (!configDia || !configDia.ativo) {
        return false; 
    }

    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const minutosAgora = horaAtual * 60 + minutoAtual;
    
    const [hInicio, mInicio] = (configDia.inicio || '09:00').split(':').map(Number);
    const [hIntervaloInicio, mIntervaloInicio] = (configDia.intervaloInicio || '12:00').split(':').map(Number);
    
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosIntervaloInicio = hIntervaloInicio * 60 + mIntervaloInicio;

    const [hIntervaloFim, mIntervaloFim] = (configDia.intervaloFim || '13:00').split(':').map(Number);
    const [hFim, mFim] = (configDia.fim || '18:00').split(':').map(Number);
    
    const minutosIntervaloFim = hIntervaloFim * 60 + mIntervaloFim;
    const minutosFim = hFim * 60 + mFim;

    const estaNoTurnoManha = (
        minutosAgora >= minutosInicio &&
        minutosAgora < minutosIntervaloInicio
    );
    
    const estaNoTurnoTarde = (
        minutosAgora >= minutosIntervaloFim &&
        minutosAgora < minutosFim
    );

    return estaNoTurnoManha || estaNoTurnoTarde;
}

async function iniciarBot(empresa) {
    const empresaId = empresa._id.toString();
    
    // ✅ VERIFICAÇÃO DE PERMISSÕES
    const botsDir = path.join(__dirname, 'bots');
    if (!fs.existsSync(botsDir)) {
        fs.mkdirSync(botsDir, { recursive: true });
        console.log(`📁 Diretório bots criado: ${botsDir}`);
    }

    if (instanciasAtivas.has(empresaId)) {
        console.log(`⚠️ Já existe uma instância ativa para ${empresa.nome} (ID: ${empresaId}). Aguardando...`);
        return null;
    }

    // ✅ CORREÇÃO CRÍTICA: USAR ID NO CAMINHO DA PASTA
    const pastaBase = path.join(__dirname, 'bots', empresaId); 
    const pasta = path.join(pastaBase, 'auth_info_baileys'); 

    if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true }); 
        console.log(`📁 Pasta criada: ${pasta}`);
    }

    instanciasAtivas.set(empresaId, true);
    console.log(`🚀 Iniciando bot para: ${empresa.nome} (ID: ${empresaId})`);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(pasta);
        const { version } = await fetchLatestBaileysVersion();

        let resolveQRCode;
        const qrCodePromise = new Promise(resolve => { 
            resolveQRCode = resolve; 
        }).catch(err => {
            console.error(`❌ [${empresa.nome}] Erro na Promise QR Code:`, err);
            return null;
        });

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: true,
            connectTimeoutMs: 60_000,
            keepAliveIntervalMs: 10_000,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            retryRequestDelayMs: 2_000,
            maxMsgRetryCount: 3,
            emitOwnEvents: false,
            defaultQueryTimeoutMs: 0,
            browser: ["Ubuntu", "Chrome", "22.04.4"],
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            console.log(`🔗 [${empresa.nome}] Estado da conexão: ${connection}`);

            // ✅ CORREÇÃO: Tratar QR code primeiro
            if (qr) {
                console.log(`📱 [${empresa.nome}] QR Code gerado - Aguardando escaneamento...`);
                try {
                    const qrCodeDataURL = await qrcode.toDataURL(qr);
                    qrCodesGerados[empresaId] = qrCodeDataURL;
                    if (resolveQRCode) resolveQRCode(qrCodeDataURL);
                } catch (error) {
                    console.error(`❌ [${empresa.nome}] Erro ao gerar QR Code:`, error);
                }
            }

            // ✅ CORREÇÃO: Tratar conexão fechada
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`🔌 [${empresa.nome}] Conexão fechada. Status: ${statusCode}, Reconectar: ${shouldReconnect}`);

                instanciasAtivas.delete(empresaId);
                delete bots[empresaId];

                if (shouldReconnect && empresa.botAtivo) {
                    console.log(`🔄 [${empresa.nome}] Tentando reconexão em 5 segundos...`);
                    setTimeout(() => {
                        if (!instanciasAtivas.has(empresaId)) {
                            iniciarBot(empresa);
                        }
                    }, 5000);
                }
                return;
            }

            // ✅ CORREÇÃO: Tratar conexão aberta
            if (connection === 'open') {
                console.log(`✅ [${empresa.nome}] Conectado com sucesso!`);
                statusBots[empresaId] = {
                    conectado: true,
                    ultimaAtualizacao: new Date(),
                    reconectando: false
                };

                delete qrCodesGerados[empresaId];
                bots[empresaId] = sock;
                
                resolveQRCode = null;
            }
        });

        // ✅✅✅ MUDANÇA CRÍTICA: HANDLER COMPLETO DE MENSAGENS INTEGRANDO TODAS CONFIGURAÇÕES DO FRONTEND ✅✅✅
        sock.ev.on('messages.upsert', async (m) => {
            console.log(`🔔 [${empresa.nome}] EVENTO MENSAGEM ACIONADO!`);
            
            try {
                const msg = m.messages?.[0];
                if (!msg || msg.key.fromMe) return;

                const sender = msg.key.remoteJid;
                const texto = msg.message?.conversation || '';
                const textoLower = texto.toLowerCase().trim();

                console.log(`👤 [${empresa.nome}] De: ${sender}, Texto: "${texto}"`);

                // ✅ BUSCAR EMPRESA ATUALIZADA DO BANCO (para pegar configurações mais recentes do frontend)
                const empresaAtualizada = await empresaDB.findById(empresa._id);
                if (!empresaAtualizada?.botAtivo) {
                    console.log(`⏸️ [${empresa.nome}] Bot está inativo, ignorando mensagem`);
                    return;
                }

                // ✅ VERIFICAR HORÁRIO COMERCIAL (configuração do frontend)
                if (!estaEmHorarioComercial(empresaAtualizada)) {
                    console.log(`⏰ [${empresa.nome}] Fora do horário comercial`);
                    
                    const agora = new Date();
                    const chaveAtendimento = `${empresaAtualizada._id}_${sender}`;
                    
                    if (!atendimentosManuais[chaveAtendimento]) {
                        atendimentosManuais[chaveAtendimento] = {
                            ativo: false,
                            ultimoContato: null,
                            iniciado: false,
                            nomeEmpresa: empresaAtualizada.nome,
                            msgFechadoEnviada: null
                        };
                    }
                    
                    const atendimento = atendimentosManuais[chaveAtendimento];
                    const minutosDesdeUltimoFechado = atendimento.msgFechadoEnviada 
                        ? (agora - atendimento.msgFechadoEnviada) / 1000 / 60 
                        : Infinity;
                    
                    const TOLERANCIA_MINUTOS = 20;

                    if (minutosDesdeUltimoFechado > TOLERANCIA_MINUTOS) {
                        const diaAtual = agora.getDay().toString();
                        const horariosMap = empresaAtualizada.horariosSemana || new Map();
                        const configDia = horariosMap.get ? horariosMap.get(diaAtual) : horariosMap[diaAtual] || {};

                        // ✅ USAR MENSAGEM DE FECHADO DO FRONTEND
                        const msgFechado = empresaAtualizada.msgFechado
                            .replace('[HORARIO_INICIO]', configDia.inicio || '00:00')
                            .replace('[HORARIO_FIM]', configDia.fim || '00:00');

                        await sock.sendMessage(sender, { text: msgFechado });
                        atendimento.msgFechadoEnviada = agora;
                    }
                    return;
                }

                // ✅ GERENCIAR ATENDIMENTOS MANUAIS
                const chaveAtendimento = `${empresaAtualizada._id}_${sender}`;
                if (!atendimentosManuais[chaveAtendimento]) {
                    atendimentosManuais[chaveAtendimento] = {
                        ativo: false,
                        ultimoContato: new Date(),
                        iniciado: false,
                        nomeEmpresa: empresaAtualizada.nome,
                        msgFechadoEnviada: null
                    };
                }
                
                const atendimento = atendimentosManuais[chaveAtendimento];
                atendimento.ultimoContato = new Date();

                // ✅ SE ESTIVER EM ATENDIMENTO HUMANO, IGNORAR BOT
                if (atendimento.ativo) {
                    console.log(`👤 [${empresa.nome}] Em atendimento humano, ignorando bot`);
                    return;
                }

                // ✅ PRIMEIRA MENSAGEM - BOAS-VINDAS PERSONALIZADA (configuração do frontend)
                if (!atendimento.iniciado) {
                    console.log(`🎉 [${empresa.nome}] Primeira mensagem do usuário`);
                    const msgBoasVindas = empresaAtualizada.msgBoasVindas || `Olá! Bem-vindo(a) ao ${empresaAtualizada.nome}! Como posso ajudar?`;
                    await sock.sendMessage(sender, { text: msgBoasVindas });
                    atendimento.iniciado = true;
                    return;
                }

                // ✅ RESPOSTAS AUTOMÁTICAS EXPANDIDAS
                let resposta = '';

                if (textoLower.includes('tudo bem') || textoLower.includes('como vai')) {
                    resposta = `Estou ótimo, obrigado! E você, tudo bem por aí? 😄`;
                }
                else if (textoLower.includes('horário') || textoLower.includes('funcionamento') || textoLower.includes('aberto')) {
                    // ✅ USAR HORÁRIOS CONFIGURADOS NO FRONTEND
                    const diaAtual = new Date().getDay().toString();
                    const horariosMap = empresaAtualizada.horariosSemana || new Map();
                    const configDia = horariosMap.get ? horariosMap.get(diaAtual) : horariosMap[diaAtual] || {};
                    
                    if (configDia.ativo) {
                        resposta = `Nosso horário de funcionamento hoje é das ${configDia.inicio} às ${configDia.fim}`;
                        if (configDia.intervaloInicio && configDia.intervaloFim) {
                            resposta += `, com intervalo das ${configDia.intervaloInicio} às ${configDia.intervaloFim}`;
                        }
                        resposta += `.`;
                    } else {
                        resposta = `Hoje estamos fechados.`;
                    }
                }
                else if (textoLower.includes('obrigado') || textoLower.includes('obrigada') || textoLower.includes('valeu')) {
                    resposta = `Por nada! Fico feliz em ajudar! 😊\nPrecisa de mais alguma coisa?`;
                }
                else if (textoLower.includes('tchau') || textoLower.includes('bye') || textoLower.includes('até mais')) {
                    resposta = `Até mais! Foi um prazer conversar com você! 👋`;
                }
                else if (textoLower.includes('#humano') || textoLower.includes('#atendente') || textoLower.includes('#manual')) {
                    resposta = `🔔 Chamando atendente humano... Por favor, aguarde.`;
                    atendimento.ativo = true;
                    console.log(`👤 [${empresa.nome}] Atendimento humano ativado para ${sender}`);
                }
                else if (textoLower.includes('#bot') || textoLower.includes('#voltar')) {
                    resposta = `🤖 Voltando para o atendimento automático. Como posso ajudar?`;
                    atendimento.ativo = false;
                    console.log(`🤖 [${empresa.nome}] Atendimento bot reativado para ${sender}`);
                }
                else {
                    // ✅ SE NÃO ENCAIXAR EM NENHUM, USA O GEMINI
                    try {
                        console.log(`🤖 [${empresa.nome}] Encaminhando para Gemini...`);
                        const { gerarRespostaGemini } = require('./gemini');
                        resposta = await gerarRespostaGemini(texto, empresaAtualizada.promptIA);
                        console.log(`✅ [${empresa.nome}] Gemini respondeu`);
                    } catch (error) {
                        console.error(`❌ [${empresa.nome}] Erro no Gemini:`, error);
                        resposta = `Desculpe, não entendi muito bem. Poderia reformular sua pergunta? 🤔\n\nOu se preferir, digite "ajuda" para ver as opções.`;
                    }
                }

                // ✅ ENVIAR RESPOSTA
                if (resposta) {
                    console.log(`🎯 [${empresa.nome}] Respondendo...`);
                    await sock.sendMessage(sender, { text: resposta });
                    console.log(`✅ [${empresa.nome}] Resposta enviada com sucesso!`);
                }

            } catch (err) {
                console.error(`❌ [${empresa.nome}] Erro no handler:`, err);
            }
        });

        console.log(`⏳ [${empresa.nome}] Aguardando QR Code...`);
        const qrCodeBase64 = await qrCodePromise; 
        console.log(`✅ [${empresa.nome}] QR Code processado`);
        return qrCodeBase64;

    } catch (error) {
        console.error(`❌ [${empresa.nome}] Erro crítico ao iniciar bot:`, error);
        instanciasAtivas.delete(empresaId);
        delete bots[empresaId];
        throw error;
    }
}

// ✅ MUDANÇA: Recebe o ID da empresa
function getQRCode(empresaId) {
    return qrCodesGerados[empresaId] || null;
}

async function reiniciarBot(empresa) {
    const empresaId = empresa._id.toString();
    console.log(`🔄 Reiniciando bot para: ${empresa.nome}`);

    // ✅ USAR A NOVA FUNÇÃO DE LIMPEZA
    await limparSessaoEmpresa(empresaId);

    instanciasAtivas.delete(empresaId);

    // ✅ MUDANÇA: USAR ID COMO CHAVE
    if (bots[empresaId]) {
        try {
            await bots[empresaId].end();
            console.log(`✅ Conexão anterior encerrada para: ${empresa.nome}`);
        } catch (err) {
            console.error(`❌ Erro ao encerrar bot ${empresa.nome}:`, err);
        }
        delete bots[empresaId];
    }

    delete qrCodesGerados[empresaId];

    await new Promise(resolve => setTimeout(resolve, 2000));

    return iniciarBot(empresa);
}

async function toggleBot(empresa) {
    const empresaId = empresa._id.toString();
    console.log(`🔧 Alternando bot ${empresa.nome} para: ${empresa.botAtivo ? 'ATIVO' : 'INATIVO'}`);

    // Lógica para Desligar
    if (!empresa.botAtivo) {
        // ✅ MUDANÇA: USAR ID COMO CHAVE
        if (bots[empresaId]) {
            try {
                await bots[empresaId].end();
                delete bots[empresaId];
                instanciasAtivas.delete(empresaId);
                console.log(`✅ Bot ${empresa.nome} desligado.`);
            } catch (err) {
                console.error(`❌ Erro ao desligar bot ${empresa.nome}:`, err);
            }
        }
        delete qrCodesGerados[empresaId];
    }

    // Lógica para Ligar
    if (empresa.botAtivo && !instanciasAtivas.has(empresaId)) {
        try {
            await iniciarBot(empresa);
            console.log(`✅ Bot ${empresa.nome} iniciado.`);
        } catch (err) {
            console.error(`❌ Erro ao iniciar bot ${empresa.nome}:`, err);
        }
    }
}

// ✅ MUDANÇA: Recebe o ID da empresa
function deletarEmpresa(empresaId) {
    console.log(`🗑️ Excluindo bot da empresa ID: ${empresaId}`);

    delete qrCodesGerados[empresaId];

    // ✅ MUDANÇA: USAR ID COMO CHAVE
    if (bots[empresaId]) {
        try {
            bots[empresaId].end();
        } catch (err) {
            console.error(`❌ Erro ao encerrar bot ID ${empresaId}:`, err);
        }
        delete bots[empresaId];
    }

    // ✅ CORREÇÃO: USAR ID NO CAMINHO DA PASTA para apagar a pasta de sessão
    const authPath = path.join(__dirname, 'bots', empresaId); 
    if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log(`🧹 Pastas de sessão removidas para ID: ${empresaId}`);
    }
    
    // Limpar atendimentos em curso
    for (const chave in atendimentosManuais) {
        if (chave.startsWith(empresaId)) {
            delete atendimentosManuais[chave];
        }
    }
    
    instanciasAtivas.delete(empresaId);
    delete statusBots[empresaId];
}

// ✅✅✅ MUDANÇA CRÍTICA: SISTEMA DE TIMEOUT PARA VOLTAR AO BOT (configuração do frontend) ✅✅✅
setInterval(async () => { 
    const agora = new Date();
    
    for (const [chave, atendimento] of Object.entries(atendimentosManuais)) {
        if (atendimento.ativo && atendimento.ultimoContato) {
            const minutosInatividade = (agora - new Date(atendimento.ultimoContato)) / 1000 / 60;
            const [empresaId, sender] = chave.split('_');
            
            try {
                const empresa = await empresaDB.findById(empresaId);
                if (empresa) {
                    // ✅ USAR TIMEOUT CONFIGURADO NO FRONTEND
                    const timeoutMinutos = empresa.timeoutHumanoMinutos || 10;
                    
                    if (minutosInatividade > timeoutMinutos) {
                        console.log(`⏰ [${empresa.nome}] Timeout de ${timeoutMinutos}min atingido, voltando para bot`);
                        
                        // Encontrar o socket da empresa
                        const sock = bots[empresaId];
                        if (sock) {
                            await sock.sendMessage(sender, {
                                text: `⏰ Retornando para o atendimento automático após ${timeoutMinutos} minutos de inatividade. Como posso ajudar?`
                            });
                        }
                        
                        atendimento.ativo = false;
                        atendimento.ultimoContato = agora;
                    }
                }
            } catch (error) {
                console.error(`❌ Erro no timeout para ${chave}:`, error);
            }
        }
    }
}, 60 * 1000); // Verificar a cada minuto

// ✅ EXPORTAÇÕES COMPLETAS
module.exports = {
    limparSessaoEmpresa,
    iniciarBot,
    getQRCode,
    reiniciarBot,
    toggleBot,
    deletarEmpresa,
    statusBots,
    instanciasAtivas,
    bots,
    atendimentosManuais
};
