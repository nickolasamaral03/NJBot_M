// // queueManager.js (Sistema de Filas com Planos)
// const { planManager, rateLimiter } = require('./plansManager');

// class QueueManager {
//     constructor() {
//         this.queues = new Map(); // { empresaId: [] }
//         this.processing = new Map(); // { empresaId: number }
//         this.stats = {
//             totalProcessed: 0,
//             totalErrors: 0,
//             totalQueueTime: 0,
//             maxQueueSize: 0,
//             queueSizes: new Map(),
//             planStats: {
//                 basic: { processed: 0, rejected: 0, queueFull: 0 },
//                 premium: { processed: 0, rejected: 0, queueFull: 0 }
//             }
//         };
        
//         // Configurações por plano
//         this.planConfigs = {
//             basic: {
//                 maxConcurrentPerEmpresa: 2,
//                 maxQueueSize: 50,
//                 maxMessagesPerMinute: 20,
//                 maxDailyMessages: 500,
//                 processingPriority: 1,
//                 timeoutMs: 30000 // 30 segundos
//             },
//             premium: {
//                 maxConcurrentPerEmpresa: 10, // Muito mais concorrente
//                 maxQueueSize: 1000, // Fila muito maior
//                 maxMessagesPerMinute: Infinity, // Sem limite
//                 maxDailyMessages: Infinity, // Sem limite
//                 processingPriority: 10, // Prioridade alta
//                 timeoutMs: 15000 // 15 segundos (mais rápido)
//             }
//         };

//         this.processingTimeouts = new Map();
        
//         // Inicializar rate limiter para empresas
//         this.initializeEmpresas();
//     }

//     // ✅ Inicializar empresas existentes no rate limiter
//     initializeEmpresas() {
//         // Isso será integrado com o banco de dados depois
//         console.log('📊 Queue Manager inicializado com sistema de planos');
//     }

//     // ✅ Obter configuração do plano da empresa
//     getEmpresaConfig(empresaId) {
//         // Em produção, buscar do banco de dados
//         // Por enquanto, vamos simular - empresas com ID par são premium, ímpar basic
//         const plan = empresaId.endsWith('0') || empresaId.endsWith('2') || empresaId.endsWith('4') || 
//                     empresaId.endsWith('6') || empresaId.endsWith('8') ? 'premium' : 'basic';
        
//         return {
//             plan,
//             ...this.planConfigs[plan]
//         };
//     }

//     // ✅ Verificar limites antes de adicionar na fila
//     async checkLimitsBeforeQueue(empresaId, config) {
//         const stats = rateLimiter.getEmpresaStats(empresaId);
        
//         // Verificar limite diário
//         if (stats && stats.dailyUsage >= config.maxDailyMessages) {
//             this.stats.planStats[config.plan].rejected++;
//             throw new Error(`Limite diário excedido (${stats.dailyUsage}/${config.maxDailyMessages} mensagens)`);
//         }

//         // Verificar limite por minuto
//         if (stats && stats.minuteUsage >= config.maxMessagesPerMinute) {
//             this.stats.planStats[config.plan].rejected++;
//             throw new Error(`Limite por minuto excedido (${stats.minuteUsage}/${config.maxMessagesPerMinute} mensagens)`);
//         }

//         return true;
//     }

//     // ✅ Adicionar mensagem na fila da empresa (COM VERIFICAÇÃO DE PLANO)
//     async addMessage(empresaId, messageData) {
//         const config = this.getEmpresaConfig(empresaId);
        
//         try {
//             // Verificar limites antes de entrar na fila
//             await this.checkLimitsBeforeQueue(empresaId, config);
            
//             // Verificar se a empresa existe na fila
//             if (!this.queues.has(empresaId)) {
//                 this.queues.set(empresaId, []);
//                 this.processing.set(empresaId, 0);
                
//                 // Inicializar no rate limiter se não existir
//                 if (!rateLimiter.getEmpresaStats(empresaId)) {
//                     rateLimiter.initializeEmpresa(empresaId, config.plan);
//                 }
//             }

//             const queue = this.queues.get(empresaId);

//             // Verificar limite máximo da fila baseado no plano
//             if (queue.length >= config.maxQueueSize) {
//                 this.stats.planStats[config.plan].queueFull++;
//                 throw new Error(`Fila da empresa ${empresaId} está cheia (${queue.length}/${config.maxQueueSize}). Plano: ${config.plan}`);
//             }

//             // Atualizar estatísticas de tamanho máximo
//             if (queue.length + 1 > this.stats.maxQueueSize) {
//                 this.stats.maxQueueSize = queue.length + 1;
//             }

//             return new Promise((resolve, reject) => {
//                 const queueEntry = {
//                     messageData,
//                     resolve,
//                     reject,
//                     timestamp: Date.now(),
//                     id: this.generateMessageId(),
//                     empresaId,
//                     plan: config.plan,
//                     priority: config.processingPriority
//                 };

//                 // Inserir na fila com prioridade (Premium primeiro)
//                 this.insertWithPriority(queue, queueEntry);
                
//                 this.stats.queueSizes.set(empresaId, queue.length);

//                 console.log(`📥 [${empresaId}] Mensagem adicionada na fila. Plano: ${config.plan}, Tamanho: ${queue.length}, Prioridade: ${config.processingPriority}`);
                
//                 // Processar a fila
//                 this.processQueue(empresaId);
//             });

//         } catch (error) {
//             console.error(`❌ [${empresaId}] Erro ao adicionar na fila:`, error.message);
//             throw error;
//         }
//     }

//     // ✅ Inserir na fila com prioridade (Premium tem prioridade maior)
//     insertWithPriority(queue, newEntry) {
//         if (queue.length === 0) {
//             queue.push(newEntry);
//             return;
//         }

//         // Encontrar posição baseada na prioridade (maior primeiro)
//         let insertIndex = queue.length;
//         for (let i = 0; i < queue.length; i++) {
//             if (newEntry.priority > queue[i].priority) {
//                 insertIndex = i;
//                 break;
//             }
//         }

//         queue.splice(insertIndex, 0, newEntry);
//     }

//     // ✅ Processar fila da empresa (COM LIMITES POR PLANO)
//     async processQueue(empresaId) {
//         const queue = this.queues.get(empresaId);
//         if (!queue || queue.length === 0) return;

//         const config = this.getEmpresaConfig(empresaId);
//         const processing = this.processing.get(empresaId) || 0;
        
//         // Verificar limite de processamento concorrente baseado no plano
//         if (processing >= config.maxConcurrentPerEmpresa) {
//             return;
//         }

//         // Remover da fila (já está ordenado por prioridade)
//         const { messageData, resolve, reject, timestamp, id, plan } = queue.shift();
//         this.processing.set(empresaId, processing + 1);
//         this.stats.queueSizes.set(empresaId, queue.length);

//         const queueTime = Date.now() - timestamp;
//         this.stats.totalQueueTime += queueTime;

//         console.log(`⚡ [${empresaId}] Processando mensagem. Plano: ${plan}, Tempo na fila: ${queueTime}ms`);

//         try {
//             // Registrar no rate limiter
//             const limitCheck = rateLimiter.checkLimit(empresaId);
//             if (!limitCheck.allowed) {
//                 throw new Error(`Limite excedido: ${limitCheck.reason}`);
//             }

//             // ✅✅✅ AJUSTE CRÍTICO: Usar a função do botManager em vez do pool antigo
//             const botManager = require('./botManager');
            
//             const result = await this.processWithTimeout(
//                 () => botManager.processarMensagem(empresaId, messageData),
//                 config.timeoutMs,
//                 empresaId,
//                 id
//             );

//             this.stats.totalProcessed++;
//             this.stats.planStats[plan].processed++;
//             resolve(result);

//         } catch (error) {
//             this.stats.totalErrors++;
//             console.error(`❌ [${empresaId}] Erro no processamento:`, error.message);
            
//             // ✅ MELHORIA: Enviar resposta de erro específica baseada no tipo de erro
//             let errorResponse = { error: 'Falha no processamento', details: error.message, plan };
            
//             if (error.message.includes('limite')) {
//                 errorResponse.userMessage = `⚠️ ${error.message}. Por favor, tente novamente em alguns minutos.`;
//             } else if (error.message.includes('Bot não disponível') || error.message.includes('Bot inativo')) {
//                 errorResponse.userMessage = `🤖 Nosso atendimento automático está temporariamente indisponível. Tente novamente em instantes.`;
//             } else if (error.message.includes('fora do horário')) {
//                 errorResponse.userMessage = `⏰ Fora do horário de atendimento.`;
//             }
            
//             reject(errorResponse);
//         } finally {
//             // Finalizar processamento
//             const currentProcessing = this.processing.get(empresaId) || 0;
//             this.processing.set(empresaId, Math.max(0, currentProcessing - 1));

//             // Limpar timeout se existir
//             if (this.processingTimeouts.has(id)) {
//                 clearTimeout(this.processingTimeouts.get(id));
//                 this.processingTimeouts.delete(id);
//             }

//             // Processar próxima mensagem
//             setImmediate(() => this.processQueue(empresaId));
//         }
//     }

//     // ✅ Processamento com timeout (diferenciado por plano)
//     async processWithTimeout(processFunction, timeoutMs, empresaId, messageId) {
//         return new Promise(async (resolve, reject) => {
//             const timeout = setTimeout(() => {
//                 reject(new Error(`Timeout de processamento excedido (${timeoutMs}ms)`));
//             }, timeoutMs);

//             this.processingTimeouts.set(messageId, timeout);

//             try {
//                 const result = await processFunction();
//                 clearTimeout(timeout);
//                 this.processingTimeouts.delete(messageId);
//                 resolve(result);
//             } catch (error) {
//                 clearTimeout(timeout);
//                 this.processingTimeouts.delete(messageId);
//                 reject(error);
//             }
//         });
//     }

//     // ✅ Obter estatísticas da fila (COM DADOS DOS PLANOS)
//     getQueueStats() {
//         const queuesInfo = [];
//         const planSummary = {
//             basic: { queues: 0, totalMessages: 0, processing: 0 },
//             premium: { queues: 0, totalMessages: 0, processing: 0 }
//         };
        
//         this.queues.forEach((queue, empresaId) => {
//             const config = this.getEmpresaConfig(empresaId);
//             const processing = this.processing.get(empresaId) || 0;
            
//             queuesInfo.push({
//                 empresaId,
//                 queueSize: queue.length,
//                 processing,
//                 plan: config.plan,
//                 maxConcurrent: config.maxConcurrentPerEmpresa,
//                 maxQueueSize: config.maxQueueSize,
//                 avgQueueTime: this.stats.totalProcessed > 0 
//                     ? Math.round(this.stats.totalQueueTime / this.stats.totalProcessed)
//                     : 0
//             });

//             // Estatísticas por plano
//             planSummary[config.plan].queues++;
//             planSummary[config.plan].totalMessages += queue.length;
//             planSummary[config.plan].processing += processing;
//         });

//         return {
//             totalProcessed: this.stats.totalProcessed,
//             totalErrors: this.stats.totalErrors,
//             totalQueueTime: this.stats.totalQueueTime,
//             maxQueueSize: this.stats.maxQueueSize,
//             avgProcessingTime: this.stats.totalProcessed > 0 
//                 ? Math.round(this.stats.totalQueueTime / this.stats.totalProcessed)
//                 : 0,
//             errorRate: this.stats.totalProcessed > 0 
//                 ? ((this.stats.totalErrors / this.stats.totalProcessed) * 100).toFixed(2)
//                 : 0,
//             planStats: this.stats.planStats,
//             planSummary,
//             queues: queuesInfo,
//             timestamp: Date.now()
//         };
//     }

//     // ✅ Limpar fila da empresa (para reinicializações)
//     clearQueue(empresaId) {
//         if (this.queues.has(empresaId)) {
//             const queue = this.queues.get(empresaId);
//             const config = this.getEmpresaConfig(empresaId);
            
//             // Rejeitar todas as promessas pendentes
//             queue.forEach(({ reject, plan }) => {
//                 reject(new Error('Fila limpa devido à reinicialização'));
//             });

//             this.queues.set(empresaId, []);
//             this.stats.queueSizes.set(empresaId, 0);
            
//             console.log(`🧹 [${empresaId}] Fila limpa. Mensagens removidas: ${queue.length}, Plano: ${config.plan}`);
//         }
//     }

//     // ✅ Obter status específico da empresa (COM INFO DO PLANO)
//     getEmpresaQueueStatus(empresaId) {
//         const queue = this.queues.get(empresaId);
//         const processing = this.processing.get(empresaId) || 0;
//         const config = this.getEmpresaConfig(empresaId);
//         const rateStats = rateLimiter.getEmpresaStats(empresaId);

//         if (!queue) {
//             return { 
//                 exists: false,
//                 plan: config.plan 
//             };
//         }

//         return {
//             exists: true,
//             queueSize: queue.length,
//             processing,
//             plan: config.plan,
//             limits: {
//                 maxConcurrent: config.maxConcurrentPerEmpresa,
//                 maxQueueSize: config.maxQueueSize,
//                 maxMessagesPerMinute: config.maxMessagesPerMinute,
//                 maxDailyMessages: config.maxDailyMessages
//             },
//             rateLimiter: rateStats,
//             nextMessage: queue.length > 0 ? {
//                 waitingTime: Date.now() - queue[0].timestamp,
//                 id: queue[0].id,
//                 priority: queue[0].priority
//             } : null
//         };
//     }

//     // ✅ Mudar plano da empresa (em tempo real)
//     changeEmpresaPlan(empresaId, newPlan) {
//         const oldConfig = this.getEmpresaConfig(empresaId);
//         const newConfig = this.planConfigs[newPlan];
        
//         // Atualizar no rate limiter
//         rateLimiter.changeEmpresaPlan(empresaId, newPlan);
        
//         console.log(`🔄 [${empresaId}] Plano alterado: ${oldConfig.plan} → ${newPlan}`);
        
//         return {
//             oldPlan: oldConfig.plan,
//             newPlan,
//             newLimits: {
//                 maxConcurrent: newConfig.maxConcurrentPerEmpresa,
//                 maxQueueSize: newConfig.maxQueueSize,
//                 maxMessagesPerMinute: newConfig.maxMessagesPerMinute,
//                 maxDailyMessages: newConfig.maxDailyMessages
//             }
//         };
//     }

//     // ✅ Health check das filas (COM VERIFICAÇÃO DE PLANOS)
//     healthCheck() {
//         const problems = [];
        
//         this.queues.forEach((queue, empresaId) => {
//             const config = this.getEmpresaConfig(empresaId);
//             const processing = this.processing.get(empresaId) || 0;
//             const rateStats = rateLimiter.getEmpresaStats(empresaId);
            
//             // Fila muito cheia (threshold diferente por plano)
//             const queueThreshold = config.plan === 'premium' ? 200 : 25;
//             if (queue.length > queueThreshold) {
//                 problems.push({
//                     level: 'WARNING',
//                     empresaId,
//                     plan: config.plan,
//                     message: `Fila com ${queue.length} mensagens pendentes (limite: ${queueThreshold})`,
//                     metric: 'queue_size'
//                 });
//             }
            
//             // Processamento travado
//             if (processing >= config.maxConcurrentPerEmpresa && queue.length > 0) {
//                 problems.push({
//                     level: 'ERROR', 
//                     empresaId,
//                     plan: config.plan,
//                     message: `Processamento travado com ${processing}/${config.maxConcurrentPerEmpresa} threads ativas`,
//                     metric: 'processing_stuck'
//                 });
//             }

//             // Limites quase atingidos (apenas para plano básico)
//             if (config.plan === 'basic' && rateStats) {
//                 if (rateStats.dailyPercentage > 80) {
//                     problems.push({
//                         level: 'WARNING',
//                         empresaId,
//                         plan: config.plan,
//                         message: `Limite diário quase atingido: ${rateStats.dailyPercentage}%`,
//                         metric: 'daily_limit'
//                     });
//                 }

//                 if (rateStats.minutePercentage > 80) {
//                     problems.push({
//                         level: 'WARNING',
//                         empresaId,
//                         plan: config.plan,
//                         message: `Limite por minuto quase atingido: ${rateStats.minutePercentage}%`,
//                         metric: 'minute_limit'
//                     });
//                 }
//             }
//         });

//         return {
//             status: problems.length === 0 ? 'HEALTHY' : 'ISSUES',
//             problems,
//             planSummary: this.stats.planStats,
//             timestamp: Date.now()
//         };
//     }

//     // ✅ Gerar ID único para mensagem
//     generateMessageId() {
//         return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//     }

//     // ✅ Obter resumo dos planos
//     getPlansSummary() {
//         return {
//             basic: {
//                 ...this.planConfigs.basic,
//                 price: "R$ 99/mês",
//                 features: [
//                     "Até 500 mensagens/dia",
//                     "Até 20 mensagens/minuto", 
//                     "Fila de até 50 mensagens",
//                     "2 processamentos simultâneos",
//                     "Prioridade padrão"
//                 ]
//             },
//             premium: {
//                 ...this.planConfigs.premium,
//                 price: "R$ 299/mês",
//                 features: [
//                     "Mensagens ilimitadas",
//                     "Processamento prioritário",
//                     "Fila de até 1000 mensagens", 
//                     "10 processamentos simultâneos",
//                     "Timeout reduzido (15s)",
//                     "Suporte prioritário"
//                 ]
//             }
//         };
//     }
// }

// // Instância global
// const queueManager = new QueueManager();

// module.exports = queueManager;