// // // server.js
// // const express = require('express');
// // const cors = require('cors');
// // const mongoose = require('mongoose');
// // const path = require('path');
// // const fs = require('fs');
// // const jwt = require('jsonwebtoken');
// // require('dotenv').config();

// // const Empresa = require('./models/Empresa');
// // const botManager = require('./botManager');

// // const { statusBots } = require('./botManager');

// // const app = express();
// // const PORT = process.env.PORT || 3000;

// // app.use(cors());
// // app.use(express.json());

// // mongoose.connect(process.env.MONGO_URI, {
// //   useNewUrlParser: true,
// //   useUnifiedTopology: true
// // }).then(() => console.log('✅ Conectado ao MongoDB Atlas'))
// //   .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

// // const JWT_SECRET = process.env.JWT_SECRET || 'chavejwtsegura';

// // const ADMIN_EMAIL = process.env.LOGIN_FIXO_EMAIL
// // const ADMIN_PASSWORD = process.env.LOGIN_FIXO_SENHA

// // const USUARIO_FIXO = {
// //   email: ADMIN_EMAIL,
// //   senha: ADMIN_PASSWORD,
// //   nome: 'Administrador'
// // };

// // // --- Rotas de Autenticação ---

// // app.post('/api/login', async (req, res) => {
// //   const { email, senha } = req.body;

// //   if (email !== USUARIO_FIXO.email || senha !== USUARIO_FIXO.senha) {
// //     return res.status(401).json({ erro: 'Email ou senha inválidos' });
// //   }

// //   const token = jwt.sign({ email: USUARIO_FIXO.email, nome: USUARIO_FIXO.nome }, JWT_SECRET, { expiresIn: '8h' });
// //   res.json({ token, nome: USUARIO_FIXO.nome, email: USUARIO_FIXO.email });
// // });


// // // --- Rotas de Gerenciamento de Empresas (CRUD) ---

// // app.post('/api/empresas', async (req, res) => {
// //     const { 
// //         nome, promptIA, telefone, ativo, 
// //         msgBoasVindas, timeoutHumanoMinutos, msgFechado, horariosSemana
// //     } = req.body;
    
// //     try {
// //       const empresaExistente = await Empresa.findOne({ nome });
// //       if (empresaExistente) return res.status(400).json({ error: 'Empresa já existe.' });

// //       const novaEmpresa = new Empresa({ 
// //           nome, promptIA, telefone, botAtivo: ativo,
// //           msgBoasVindas, timeoutHumanoMinutos, msgFechado, horariosSemana
// //       });
// //       await novaEmpresa.save(); // Salva para ter o _id

// //       // ✅ CORREÇÃO CRÍTICA: USAR ID NO CAMINHO DA PASTA (Resolve ENOENT)
// //       const empresaId = novaEmpresa._id.toString();
// //       const pasta = path.join(__dirname, 'bots', empresaId); 
// //       if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
// //       fs.writeFileSync(path.join(pasta, 'prompt.txt'), promptIA);

// //       // Inicia o bot via botManager
// //       const qrCode = await botManager.iniciarBot(novaEmpresa);

// //       return res.json({ qrCode, empresa: novaEmpresa });

// //   } catch (err) {
// //     console.error('❌ Erro ao cadastrar empresa:', err);
// //     return res.status(500).json({ error: 'Erro ao cadastrar empresa.' });
// //   }
// // });

// // app.get('/api/empresas', async (req, res) => {
// //   try {
// //     const empresas = await Empresa.find();
// //     return res.json(empresas);
// //   } catch (err) {
// //     console.error(err);
// //     return res.status(500).json({ error: 'Erro ao listar empresas.' });
// //   }
// // });

// // // Rota para buscar uma única empresa por ID
// // app.get('/api/empresas/:id', async (req, res) => {
// //     const { id } = req.params;
    
// //     try {
// //       if (!mongoose.Types.ObjectId.isValid(id)) {
// //         return res.status(400).json({ error: 'ID inválido.' });
// //       }
  
// //       const empresa = await Empresa.findById(id);
      
// //       if (!empresa) {
// //         return res.status(404).json({ error: 'Empresa não encontrada.' });
// //       }
  
// //       return res.json(empresa);
// //     } catch (error) {
// //       console.error('❌ Erro ao buscar empresa por ID:', error);
// //       return res.status(500).json({ error: 'Erro interno ao buscar empresa.' });
// //     }
// // });


// // app.put('/api/empresas/:id', async (req, res) => {
// //   const { id } = req.params;
// //   const { 
// //       nome, promptIA, telefone, botAtivo, 
// //       msgBoasVindas, timeoutHumanoMinutos, msgFechado, horariosSemana 
// //   } = req.body;

// //   try {
// //     if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

// //     const empresaAntiga = await Empresa.findById(id);
// //     if (!empresaAntiga) return res.status(404).json({ error: 'Empresa não encontrada.' });

// //     const empresaAtualizada = await Empresa.findByIdAndUpdate(
// //       id,
// //       { 
// //           nome, promptIA, telefone, botAtivo, 
// //           msgBoasVindas, timeoutHumanoMinutos, msgFechado, horariosSemana 
// //       },
// //       { new: true, runValidators: true }
// //     );

// //     // ⚠️ REMOVIDO: Lógica de renomear pasta. A pasta usa o ID fixo.

// //     // ✅ CORREÇÃO: USAR ID NO CAMINHO (O ID é o parâmetro 'id')
// //     const pasta = path.join(__dirname, 'bots', id);
// //     if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
// //     fs.writeFileSync(path.join(pasta, 'prompt.txt'), promptIA);

// //     res.json(empresaAtualizada);
// //   } catch (error) {
// //     console.error('❌ Erro ao atualizar empresa:', error);
// //     res.status(500).json({ error: 'Erro ao atualizar empresa.' });
// //   }
// // });

// // app.delete('/api/empresas/:id', async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

// //     const empresa = await Empresa.findById(id);
// //     if (!empresa) return res.status(404).json({ message: 'Empresa não encontrada' });

// //     await Empresa.findByIdAndDelete(id);

// //     // ✅ CORREÇÃO: USAR ID NO CAMINHO DA PASTA
// //     const pastaEmpresa = path.join(__dirname, 'bots', id);
// //     if (fs.existsSync(pastaEmpresa)) fs.rmSync(pastaEmpresa, { recursive: true, force: true });

// //     // ✅ CORREÇÃO: Passar o ID para deletar
// //     botManager.deletarEmpresa(id);

// //     res.status(200).json({ message: 'Empresa deletada com sucesso' });
// //   } catch (error) {
// //     console.error('Erro ao deletar empresa:', error);
// //     res.status(500).json({ message: 'Erro ao deletar empresa' });
// //   }
// // });

// // app.put('/api/empresas/:id/toggle-bot', async (req, res) => {
// //   try {
// //     const { id } = req.params;

// //     if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

// //     const empresa = await Empresa.findById(id);
// //     if (!empresa) return res.status(404).json({ message: 'Empresa não encontrada' });

// //     empresa.botAtivo = !empresa.botAtivo;
// //     await empresa.save();

// //     // Ligar/desligar bot via botManager
// //     await botManager.toggleBot(empresa);

// //     res.status(200).json({ botAtivo: empresa.botAtivo });

// //   } catch (error) {
// //     console.error('Erro ao alternar bot:', error);
// //     res.status(500).json({ message: 'Erro ao alternar bot' });
// //   }
// // });


// // // --- Rotas de Controle do Bot (QR Code / Reiniciar) ---

// // app.get('/api/qr/:id', async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

// //     const empresa = await Empresa.findById(id);
// //     if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada.' });

// //     // Lógica de Status: Se conectado, retorna 204 (No Content)
// //     const idString = empresa._id.toString();
// //     if (statusBots[idString]?.conectado) {
// //       return res.status(204).json(); 
// //     }

// //     // ✅ CORREÇÃO: Usar o ID como chave (botManager.js usa o ID)
// //     const qr = botManager.getQRCode(idString); 
    
// //     if (qr) return res.json({ qrCode: qr });
// //     else return res.status(204).json();

// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ error: 'Erro ao buscar QR code.' });
// //   }
// // });

// // // app.post('/api/reiniciar-bot/:id', async (req, res) => {
// // //   try {
// // //     const { id } = req.params;
// // //     if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

// // //     const empresa = await Empresa.findById(id);
// // //     if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada.' });

// // //     await botManager.reiniciarBot(empresa);

// // //     // ✅ CORREÇÃO: Usar o ID como chave
// // //     const qrCode = botManager.getQRCode(empresa._id.toString());
// // //     res.json({ qrCode });

// // //   } catch (err) {
// // //     console.error(err);
// // //     return res.status(500).json({ error: 'Erro ao reiniciar bot.' });
// // //   }
// // // });

// // app.post('/api/reiniciar-bot/:id', async (req, res) => {
// //     try {
// //         const { id } = req.params;
// //         if (!mongoose.Types.ObjectId.isValid(id)) {
// //             return res.status(400).json({ error: 'ID inválido' });
// //         }

// //         const empresa = await Empresa.findById(id);
// //         if (!empresa) {
// //             return res.status(404).json({ error: 'Empresa não encontrada.' });
// //         }

// //         // ✅ CORREÇÃO: Usar a função do botManager
// //         await botManager.limparSessaoEmpresa(id);
        
// //         // ✅ Pequeno delay para garantir limpeza
// //         await new Promise(resolve => setTimeout(resolve, 2000));
        
// //         const qrCode = await botManager.reiniciarBot(empresa);

// //         res.json({ 
// //             qrCode,
// //             message: 'Bot reiniciado com sucesso' 
// //         });

// //     } catch (err) {
// //         console.error('❌ Erro ao reiniciar bot:', err);
// //         return res.status(500).json({ error: 'Erro ao reiniciar bot.' });
// //     }
// // });


// // // --- Rotas de Status/Health Check ---

// // app.get('/api/bots/status', (req, res) => {
// //   res.json(statusBots);
// // });

// // app.get('/', (req, res) => {
// //   res.send('🤖 API do NJBot está rodando!');
// // });


// // // --- Inicialização do Servidor ---

// // // Iniciar todos bots ao subir servidor
// // (async () => {
// //   const empresas = await Empresa.find();
// //   empresas.forEach(empresa => botManager.iniciarBot(empresa));
// // })();

// // app.listen(PORT, () => {
// //   console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
// // });

// const fs = require('fs');
// const path = require('path');
// const qrcode = require('qrcode');
// const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
// const empresaDB = require('./models/Empresa');

// // ✅ CACHE GLOBAL
// const bots = {};
// const atendimentosManuais = {};
// const qrCodesGerados = {};
// const statusBots = {};
// const instanciasAtivas = new Map();
// const connectionStates = new Map(); // Para controlar estado da conexão

// async function limparSessaoEmpresa(empresaId) {
//     const pastaBase = path.join(__dirname, 'bots', empresaId.toString());
//     if (fs.existsSync(pastaBase)) {
//         try {
//             fs.rmSync(pastaBase, { recursive: true, force: true });
//             console.log(`🧹 Sessão limpa para empresa ID: ${empresaId}`);
//         } catch (error) {
//             console.error(`❌ Erro ao limpar sessão: ${error}`);
//         }
//     }
// }

// function estaEmHorarioComercial(empresa) {
//     const agora = new Date();
//     const diaAtual = agora.getDay().toString();
    
//     const horariosMap = empresa.horariosSemana || {};
//     const configDia = horariosMap[diaAtual]; 
    
//     if (!configDia || !configDia.ativo) return false;

//     const horaAtual = agora.getHours();
//     const minutoAtual = agora.getMinutes();
//     const minutosAgora = horaAtual * 60 + minutoAtual;
    
//     const [hInicio, mInicio] = (configDia.inicio || '09:00').split(':').map(Number);
//     const [hIntervaloInicio, mIntervaloInicio] = (configDia.intervaloInicio || '12:00').split(':').map(Number);
//     const [hIntervaloFim, mIntervaloFim] = (configDia.intervaloFim || '13:00').split(':').map(Number);
//     const [hFim, mFim] = (configDia.fim || '18:00').split(':').map(Number);
    
//     const minutosInicio = hInicio * 60 + mInicio;
//     const minutosIntervaloInicio = hIntervaloInicio * 60 + mIntervaloInicio;
//     const minutosIntervaloFim = hIntervaloFim * 60 + mIntervaloFim;
//     const minutosFim = hFim * 60 + mFim;

//     const estaNoTurnoManha = (minutosAgora >= minutosInicio && minutosAgora < minutosIntervaloInicio);
//     const estaNoTurnoTarde = (minutosAgora >= minutosIntervaloFim && minutosAgora < minutosFim);

//     return estaNoTurnoManha || estaNoTurnoTarde;
// }

// async function iniciarBot(empresa) {
//     const empresaId = empresa._id.toString();
    
//     // ✅ Evitar múltiplas instâncias
//     if (instanciasAtivas.has(empresaId)) {
//         console.log(`⚠️ Já existe uma instância ativa para ${empresa.nome}`);
//         return null;
//     }

//     // ✅ Inicializar estado
//     statusBots[empresaId] = false;
//     connectionStates.set(empresaId, 'connecting');
//     instanciasAtivas.set(empresaId, true);

//     const pastaBase = path.join(__dirname, 'bots', empresaId); 
//     const pasta = path.join(pastaBase, 'auth_info_baileys'); 

//     if (!fs.existsSync(pasta)) {
//         fs.mkdirSync(pasta, { recursive: true });
//     }

//     console.log(`🚀 Iniciando bot para: ${empresa.nome}`);

//     try {
//         const { state, saveCreds } = await useMultiFileAuthState(pasta);
//         const { version } = await fetchLatestBaileysVersion();

//         let resolveQRCode;
//         const qrCodePromise = new Promise((resolve, reject) => { 
//             resolveQRCode = resolve;
//             // Timeout para evitar promise pendente
//             setTimeout(() => reject(new Error('QR Code timeout')), 30000);
//         });

//         // ✅ CONFIGURAÇÃO ATUALIZADA - sem opções deprecated
//         const sock = makeWASocket({
//             version,
//             auth: state,
//             // REMOVED: printQRInTerminal: true, // Esta opção está deprecated
//             connectTimeoutMs: 60_000,
//             keepAliveIntervalMs: 10_000,
//             markOnlineOnConnect: false,
//             generateHighQualityLinkPreview: true,
//             browser: ["Ubuntu", "Chrome", "22.04.4"],
//             // ✅ Nova configuração recomendada
//             syncFullHistory: false,
//             transactionOpts: {
//                 maxCommitRetries: 3,
//                 delayBetweenTriesMs: 1000
//             }
//         });

//         sock.ev.on('creds.update', saveCreds);

//         // ✅ CONNECTION.UPDATE - LÓGICA MELHORADA
//         sock.ev.on('connection.update', async (update) => {
//             const { connection, lastDisconnect, qr } = update;

//             console.log(`🔗 [${empresa.nome}] Estado: ${connection}`, qr ? 'QR Recebido' : '');

//             // ✅ QR CODE
//             if (qr) {
//                 console.log(`📱 [${empresa.nome}] QR Code gerado`);
//                 try {
//                     const qrCodeDataURL = await qrcode.toDataURL(qr);
//                     qrCodesGerados[empresaId] = qrCodeDataURL;
//                     statusBots[empresaId] = false; // Aguardando scan
//                     connectionStates.set(empresaId, 'qr_waiting');
                    
//                     if (resolveQRCode) {
//                         resolveQRCode(qrCodeDataURL);
//                         resolveQRCode = null;
//                     }
//                 } catch (error) {
//                     console.error(`❌ Erro ao gerar QR Code:`, error);
//                 }
//             }

//             // ✅ CONEXÃO FECHADA
//             if (connection === 'close') {
//                 const statusCode = lastDisconnect?.error?.output?.statusCode;
//                 const isLoggedOut = statusCode === DisconnectReason.loggedOut;

//                 console.log(`🔌 [${empresa.nome}] Conexão fechada. Status: ${statusCode}, Logged out: ${isLoggedOut}`);

//                 if (isLoggedOut) {
//                     // ✅ LOGOUT MANUAL - limpar tudo
//                     statusBots[empresaId] = false;
//                     connectionStates.set(empresaId, 'logged_out');
//                     instanciasAtivas.delete(empresaId);
//                     delete bots[empresaId];
//                     delete qrCodesGerados[empresaId];
                    
//                     // Limpar sessão
//                     await limparSessaoEmpresa(empresaId);
//                     console.log(`🔴 [${empresa.nome}] Logged out - Sessão finalizada`);
//                 } else {
//                     // ✅ OUTRAS DESCONEXÕES - tentar reconectar
//                     statusBots[empresaId] = false;
//                     connectionStates.set(empresaId, 'disconnected');
                    
//                     console.log(`🟡 [${empresa.nome}] Tentando reconectar em 5 segundos...`);
                    
//                     setTimeout(async () => {
//                         if (empresa.botAtivo && !instanciasAtivas.has(empresaId)) {
//                             try {
//                                 await iniciarBot(empresa);
//                             } catch (error) {
//                                 console.error(`❌ Erro na reconexão:`, error);
//                             }
//                         }
//                     }, 5000);
//                 }
//                 return;
//             }

//             // ✅ CONEXÃO ABERTA
//             if (connection === 'open') {
//                 console.log(`✅ [${empresa.nome}] Conectado com sucesso!`);
//                 statusBots[empresaId] = true;
//                 connectionStates.set(empresaId, 'connected');
//                 delete qrCodesGerados[empresaId];
//                 bots[empresaId] = sock;
                
//                 if (resolveQRCode) {
//                     resolveQRCode(null); // Resolve a promise sem QR
//                     resolveQRCode = null;
//                 }
//             }

//             // ✅ CONECTANDO
//             if (connection === 'connecting') {
//                 console.log(`🟡 [${empresa.nome}] Conectando...`);
//                 statusBots[empresaId] = false;
//                 connectionStates.set(empresaId, 'connecting');
//             }
//         });

//         // ✅ HANDLER DE MENSAGENS (mantido igual)
//         sock.ev.on('messages.upsert', async (m) => {
//             try {
//                 const msg = m.messages?.[0];
//                 if (!msg || msg.key.fromMe || !msg.message) return;

//                 const sender = msg.key.remoteJid;
//                 const texto = msg.message?.conversation || 
//                              msg.message?.extendedTextMessage?.text || 
//                              msg.message?.imageMessage?.caption || '';
//                 const textoLower = texto.toLowerCase().trim();

//                 // ✅ BUSCAR EMPRESA ATUALIZADA
//                 const empresaAtualizada = await empresaDB.findById(empresa._id);
//                 if (!empresaAtualizada?.botAtivo) return;

//                 // ✅ VERIFICAR HORÁRIO COMERCIAL
//                 if (!estaEmHorarioComercial(empresaAtualizada)) {
//                     const agora = new Date();
//                     const chaveAtendimento = `${empresaAtualizada._id}_${sender}`;
                    
//                     if (!atendimentosManuais[chaveAtendimento]) {
//                         atendimentosManuais[chaveAtendimento] = {
//                             msgFechadoEnviada: null
//                         };
//                     }
                    
//                     const atendimento = atendimentosManuais[chaveAtendimento];
//                     const minutosDesdeUltimoFechado = atendimento.msgFechadoEnviada 
//                         ? (agora - atendimento.msgFechadoEnviada) / 1000 / 60 
//                         : Infinity;
                    
//                     if (minutosDesdeUltimoFechado > 20) {
//                         const diaAtual = agora.getDay().toString();
//                         const horariosMap = empresaAtualizada.horariosSemana || {};
//                         const configDia = horariosMap[diaAtual] || {};

//                         const msgFechado = empresaAtualizada.msgFechado
//                             .replace('[HORARIO_INICIO]', configDia.inicio || '00:00')
//                             .replace('[HORARIO_FIM]', configDia.fim || '00:00');

//                         await sock.sendMessage(sender, { text: msgFechado });
//                         atendimento.msgFechadoEnviada = agora;
//                     }
//                     return;
//                 }

//                 // ✅ GERENCIAR ATENDIMENTOS
//                 const chaveAtendimento = `${empresaAtualizada._id}_${sender}`;
//                 if (!atendimentosManuais[chaveAtendimento]) {
//                     atendimentosManuais[chaveAtendimento] = {
//                         ativo: false,
//                         iniciado: false,
//                         ultimoContato: new Date()
//                     };
//                 }
                
//                 const atendimento = atendimentosManuais[chaveAtendimento];
//                 atendimento.ultimoContato = new Date();

//                 if (atendimento.ativo) return;

//                 if (!atendimento.iniciado) {
//                     const msgBoasVindas = empresaAtualizada.msgBoasVindas || `Olá! Bem-vindo(a) ao ${empresaAtualizada.nome}!`;
//                     await sock.sendMessage(sender, { text: msgBoasVindas });
//                     atendimento.iniciado = true;
//                     return;
//                 }

//                 let resposta = '';

//                 if (textoLower.includes('tudo bem') || textoLower.includes('como vai')) {
//                     resposta = `Estou ótimo, obrigado! E você? 😄`;
//                 }
//                 else if (textoLower.includes('horário') || textoLower.includes('funcionamento')) {
//                     const diaAtual = new Date().getDay().toString();
//                     const horariosMap = empresaAtualizada.horariosSemana || {};
//                     const configDia = horariosMap[diaAtual] || {};
                    
//                     if (configDia.ativo) {
//                         resposta = `Horário: ${configDia.inicio} às ${configDia.fim}`;
//                         if (configDia.intervaloInicio && configDia.intervaloFim) {
//                             resposta += ` (intervalo ${configDia.intervaloInicio}-${configDia.intervaloFim})`;
//                         }
//                     } else {
//                         resposta = `Hoje estamos fechados.`;
//                     }
//                 }
//                 else if (textoLower.includes('obrigado') || textoLower.includes('obrigada')) {
//                     resposta = `Por nada! 😊`;
//                 }
//                 else if (textoLower.includes('#humano') || textoLower.includes('#atendente')) {
//                     resposta = `🔔 Chamando atendente humano...`;
//                     atendimento.ativo = true;
//                 }
//                 else if (textoLower.includes('#bot') || textoLower.includes('#voltar')) {
//                     resposta = `🤖 Voltando para atendimento automático.`;
//                     atendimento.ativo = false;
//                 }
//                 else {
//                     try {
//                         const { gerarRespostaGemini } = require('./gemini');
//                         resposta = await gerarRespostaGemini(texto, empresaAtualizada.promptIA);
//                     } catch (error) {
//                         console.error('Erro Gemini:', error);
//                         resposta = `Desculpe, não entendi. Poderia reformular? 🤔`;
//                     }
//                 }

//                 if (resposta) {
//                     await sock.sendMessage(sender, { text: resposta });
//                 }

//             } catch (err) {
//                 console.error(`❌ Erro no handler:`, err);
//             }
//         });

//         // ✅ Aguardar QR Code ou conexão
//         const qrCodeBase64 = await qrCodePromise.catch(() => null);
//         return qrCodeBase64;

//     } catch (error) {
//         console.error(`❌ Erro crítico em ${empresa.nome}:`, error);
        
//         // ✅ Limpar recursos em caso de erro
//         instanciasAtivas.delete(empresaId);
//         delete bots[empresaId];
//         delete statusBots[empresaId];
//         delete qrCodesGerados[empresaId];
//         connectionStates.delete(empresaId);
        
//         throw error;
//     }
// }

// // ✅ FUNÇÕES AUXILIARES
// function getQRCode(empresaId) {
//     return qrCodesGerados[empresaId] || null;
// }

// function getBotStatus(empresaId) {
//     return {
//         connected: statusBots[empresaId] || false,
//         state: connectionStates.get(empresaId) || 'disconnected',
//         hasQR: !!qrCodesGerados[empresaId]
//     };
// }

// async function reiniciarBot(empresa) {
//     const empresaId = empresa._id.toString();
//     console.log(`🔄 Reiniciando bot: ${empresa.nome}`);

//     // ✅ Parar instância atual
//     if (bots[empresaId]) {
//         try {
//             await bots[empresaId].end();
//         } catch (err) {
//             console.error(`❌ Erro ao encerrar bot:`, err);
//         }
//     }

//     // ✅ Limpar tudo
//     await limparSessaoEmpresa(empresaId);
//     instanciasAtivas.delete(empresaId);
//     delete bots[empresaId];
//     delete qrCodesGerados[empresaId];
//     delete statusBots[empresaId];
//     connectionStates.delete(empresaId);

//     // ✅ Aguardar limpeza
//     await new Promise(resolve => setTimeout(resolve, 3000));

//     // ✅ Reiniciar
//     return iniciarBot(empresa);
// }

// async function toggleBot(empresa) {
//     const empresaId = empresa._id.toString();
//     console.log(`🔧 Alternando bot: ${empresa.botAtivo ? 'LIGAR' : 'DESLIGAR'}`);

//     if (!empresa.botAtivo && bots[empresaId]) {
//         try {
//             await bots[empresaId].end();
//             delete bots[empresaId];
//             instanciasAtivas.delete(empresaId);
//             delete qrCodesGerados[empresaId];
//         } catch (err) {
//             console.error(`❌ Erro ao desligar bot:`, err);
//         }
//     }

//     if (empresa.botAtivo && !instanciasAtivas.has(empresaId)) {
//         try {
//             await iniciarBot(empresa);
//         } catch (err) {
//             console.error(`❌ Erro ao iniciar bot:`, err);
//         }
//     }
// }

// function deletarEmpresa(empresaId) {
//     console.log(`🗑️ Excluindo bot ID: ${empresaId}`);

//     // ✅ Limpar tudo
//     delete qrCodesGerados[empresaId];

//     if (bots[empresaId]) {
//         try {
//             bots[empresaId].end();
//         } catch (err) {
//             console.error(`❌ Erro ao encerrar bot:`, err);
//         }
//         delete bots[empresaId];
//     }

//     const authPath = path.join(__dirname, 'bots', empresaId); 
//     if (fs.existsSync(authPath)) {
//         fs.rmSync(authPath, { recursive: true, force: true });
//     }
    
//     for (const chave in atendimentosManuais) {
//         if (chave.startsWith(empresaId)) {
//             delete atendimentosManuais[chave];
//         }
//     }
    
//     instanciasAtivas.delete(empresaId);
//     delete statusBots[empresaId];
//     connectionStates.delete(empresaId);
// }

// // ✅ Cleanup de atendimentos inativos
// setInterval(() => { 
//     const agora = new Date();
    
//     for (const [chave, atendimento] of Object.entries(atendimentosManuais)) {
//         if (atendimento.ultimoContato) {
//             const minutosInatividade = (agora - new Date(atendimento.ultimoContato)) / 1000 / 60;
            
//             if (minutosInatividade > 30) { // 30 minutos de inatividade
//                 delete atendimentosManuais[chave];
//             }
//         }
//     }
// }, 10 * 60 * 1000); // A cada 10 minutos

// module.exports = {
//     limparSessaoEmpresa,
//     iniciarBot,
//     getQRCode,
//     getBotStatus,
//     reiniciarBot,
//     toggleBot,
//     deletarEmpresa,
//     statusBots
// };

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Empresa = require('./models/Empresa');
const botManager = require('./botManager');

// ✅ IMPORTE CORRETO - use destructuring para pegar todas as funções
const { statusBots, getBotStatus } = require('./botManager');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ REMOVA AS OPÇÕES DEPRECATED do Mongoose
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'chavejwtsegura';

const ADMIN_EMAIL = process.env.LOGIN_FIXO_EMAIL;
const ADMIN_PASSWORD = process.env.LOGIN_FIXO_SENHA;

const USUARIO_FIXO = {
  email: ADMIN_EMAIL,
  senha: ADMIN_PASSWORD,
  nome: 'Administrador'
};

// --- Rotas de Autenticação ---

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;

  if (email !== USUARIO_FIXO.email || senha !== USUARIO_FIXO.senha) {
    return res.status(401).json({ erro: 'Email ou senha inválidos' });
  }

  const token = jwt.sign({ email: USUARIO_FIXO.email, nome: USUARIO_FIXO.nome }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, nome: USUARIO_FIXO.nome, email: USUARIO_FIXO.email });
});

// --- Rotas de Gerenciamento de Empresas (CRUD) ---

app.post('/api/empresas', async (req, res) => {
    const { 
        nome, promptIA, telefone, ativo, 
        msgBoasVindas, timeoutHumanoMinutos, msgFechado, horariosSemana
    } = req.body;
    
    try {
      const empresaExistente = await Empresa.findOne({ nome });
      if (empresaExistente) return res.status(400).json({ error: 'Empresa já existe.' });

      const novaEmpresa = new Empresa({ 
          nome, promptIA, telefone, botAtivo: ativo,
          msgBoasVindas, timeoutHumanoMinutos, msgFechado, horariosSemana
      });
      await novaEmpresa.save();

      // ✅ CORREÇÃO: Criar pasta com ID
      const empresaId = novaEmpresa._id.toString();
      const pasta = path.join(__dirname, 'bots', empresaId); 
      if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
      fs.writeFileSync(path.join(pasta, 'prompt.txt'), promptIA);

      // ✅ CORREÇÃO: Iniciar bot com tratamento de erro
      let qrCode = null;
      try {
        qrCode = await botManager.iniciarBot(novaEmpresa);
      } catch (botError) {
        console.error(`❌ Erro ao iniciar bot:`, botError);
        // Continua mesmo com erro no bot, mas retorna sucesso na criação
      }

      return res.json({ qrCode, empresa: novaEmpresa });

  } catch (err) {
    console.error('❌ Erro ao cadastrar empresa:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar empresa.' });
  }
});

app.get('/api/empresas', async (req, res) => {
  try {
    const empresas = await Empresa.find();
    return res.json(empresas);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao listar empresas.' });
  }
});

// Rota para buscar uma única empresa por ID
app.get('/api/empresas/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
  
      const empresa = await Empresa.findById(id);
      
      if (!empresa) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
  
      return res.json(empresa);
    } catch (error) {
      console.error('❌ Erro ao buscar empresa por ID:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar empresa.' });
    }
});

app.put('/api/empresas/:id', async (req, res) => {
  const { id } = req.params;
  const { 
      nome, promptIA, telefone, botAtivo, 
      msgBoasVindas, timeoutHumanoMinutos, msgFechado, horariosSemana 
  } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

    const empresaAntiga = await Empresa.findById(id);
    if (!empresaAntiga) return res.status(404).json({ error: 'Empresa não encontrada.' });

    const empresaAtualizada = await Empresa.findByIdAndUpdate(
      id,
      { 
          nome, promptIA, telefone, botAtivo, 
          msgBoasVindas, timeoutHumanoMinutos, msgFechado, horariosSemana 
      },
      { new: true, runValidators: true }
    );

    // ✅ CORREÇÃO: USAR ID NO CAMINHO
    const pasta = path.join(__dirname, 'bots', id);
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(path.join(pasta, 'prompt.txt'), promptIA);

    res.json(empresaAtualizada);
  } catch (error) {
    console.error('❌ Erro ao atualizar empresa:', error);
    res.status(500).json({ error: 'Erro ao atualizar empresa.' });
  }
});

app.delete('/api/empresas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

    const empresa = await Empresa.findById(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa não encontrada' });

    await Empresa.findByIdAndDelete(id);

    // ✅ CORREÇÃO: Limpar pasta e recursos do bot
    const pastaEmpresa = path.join(__dirname, 'bots', id);
    if (fs.existsSync(pastaEmpresa)) fs.rmSync(pastaEmpresa, { recursive: true, force: true });

    botManager.deletarEmpresa(id);

    res.status(200).json({ message: 'Empresa deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar empresa:', error);
    res.status(500).json({ message: 'Erro ao deletar empresa' });
  }
});

app.put('/api/empresas/:id/toggle-bot', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

    const empresa = await Empresa.findById(id);
    if (!empresa) return res.status(404).json({ message: 'Empresa não encontrada' });

    empresa.botAtivo = !empresa.botAtivo;
    await empresa.save();

    // ✅ CORREÇÃO: Usar toggleBot atualizado
    await botManager.toggleBot(empresa);

    res.status(200).json({ botAtivo: empresa.botAtivo });

  } catch (error) {
    console.error('Erro ao alternar bot:', error);
    res.status(500).json({ message: 'Erro ao alternar bot' });
  }
});

// --- Rotas de Controle do Bot (QR Code / Reiniciar) ---

app.get('/api/qr/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'ID inválido' });

    const empresa = await Empresa.findById(id);
    if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada.' });

    // ✅ CORREÇÃO: Usar a nova função getBotStatus
    const botStatus = botManager.getBotStatus(id);
    
    if (botStatus.connected) {
      return res.status(204).json(); 
    }

    const qr = botManager.getQRCode(id); 
    
    if (qr) return res.json({ qrCode: qr });
    else return res.status(204).json();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar QR code.' });
  }
});

app.post('/api/reiniciar-bot/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const empresa = await Empresa.findById(id);
        if (!empresa) {
            return res.status(404).json({ error: 'Empresa não encontrada.' });
        }

        // ✅ CORREÇÃO: Usar a função do botManager atualizada
        const qrCode = await botManager.reiniciarBot(empresa);

        res.json({ 
            qrCode,
            message: 'Bot reiniciado com sucesso' 
        });

    } catch (err) {
        console.error('❌ Erro ao reiniciar bot:', err);
        return res.status(500).json({ error: 'Erro ao reiniciar bot.' });
    }
});

// --- Rotas de Status/Health Check ---

// ✅ NOVA ROTA: Status detalhado dos bots
app.get('/api/bots/status-detailed', (req, res) => {
  try {
    const statusDetalhado = {};
    
    // Para cada empresa no statusBots, obter status detalhado
    Object.keys(botManager.statusBots).forEach(empresaId => {
      statusDetalhado[empresaId] = botManager.getBotStatus(empresaId);
    });
    
    res.json(statusDetalhado);
  } catch (error) {
    console.error('Erro ao buscar status detalhado:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ✅ ROTA DE STATUS SIMPLES (mantida para compatibilidade)
app.get('/api/bots/status', (req, res) => {
  try {
    const statusSimples = {};
    
    Object.keys(botManager.statusBots).forEach(empresaId => {
      const botStatus = botManager.getBotStatus(empresaId);
      statusSimples[empresaId] = botStatus.connected;
    });
    
    res.json(statusSimples);
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/', (req, res) => {
  res.send('🤖 API do NJBot está rodando!');
});

// --- Inicialização do Servidor MELHORADA ---

app.listen(PORT, async () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  
  // ✅ INICIALIZAÇÃO MELHORADA DOS BOTS
  try {
    const empresas = await Empresa.find({ botAtivo: true });
    console.log(`🔧 Iniciando ${empresas.length} bots ativos...`);
    
    // Iniciar bots com delay para evitar sobrecarga
    for (let i = 0; i < empresas.length; i++) {
      const empresa = empresas[i];
      try {
        console.log(`🚀 Iniciando bot para: ${empresa.nome}`);
        await botManager.iniciarBot(empresa);
        
        // Aguardar entre iniciações
        if (i < empresas.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error(`❌ Erro ao iniciar bot ${empresa.nome}:`, error);
      }
    }
    
    console.log('✅ Todos os bots foram inicializados');
  } catch (error) {
    console.error('❌ Erro na inicialização dos bots:', error);
  }
});

// ✅ ROTA DE HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    botsAtivos: Object.keys(botManager.statusBots).length
  });
});