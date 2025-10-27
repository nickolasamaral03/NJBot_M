// queueManager.js ( Lidar com filas das empresas )  
class QueueManager {
    constructor() {
        this.queues = new Map(); // { empresaId: [] }
        this.processing = new Map(); // { empresaId: number }
        this.stats = {
            totalProcessed: 0,
            totalErrors: 0,
            totalQueueTime: 0,
            maxQueueSize: 0,
            queueSizes: new Map()
        };
        
        // Configurações
        this.maxConcurrentPerEmpresa = 3;
        this.maxQueueSize = 100;
        this.processingTimeouts = new Map();
    }

    // ✅ Adicionar mensagem na fila da empresa
    async addMessage(empresaId, messageData) {
        // Verificar se a empresa existe na fila
        if (!this.queues.has(empresaId)) {
            this.queues.set(empresaId, []);
            this.processing.set(empresaId, 0);
        }

        const queue = this.queues.get(empresaId);

        // Verificar limite máximo da fila
        if (queue.length >= this.maxQueueSize) {
            throw new Error(`Fila da empresa ${empresaId} está cheia. Tente novamente mais tarde.`);
        }

        // Atualizar estatísticas de tamanho máximo
        if (queue.length + 1 > this.stats.maxQueueSize) {
            this.stats.maxQueueSize = queue.length + 1;
        }

        return new Promise((resolve, reject) => {
            const queueEntry = {
                messageData,
                resolve,
                reject,
                timestamp: Date.now(),
                id: this.generateMessageId()
            };

            queue.push(queueEntry);
            this.stats.queueSizes.set(empresaId, queue.length);

            console.log(`📥 [${empresaId}] Mensagem adicionada na fila. Tamanho: ${queue.length}`);
            
            // Processar a fila
            this.processQueue(empresaId);
        });
    }

    // ✅ Processar fila da empresa
    async processQueue(empresaId) {
        const queue = this.queues.get(empresaId);
        if (!queue || queue.length === 0) return;

        const processing = this.processing.get(empresaId) || 0;
        
        // Verificar limite de processamento concorrente
        if (processing >= this.maxConcurrentPerEmpresa) {
            return;
        }

        // Remover da fila
        const { messageData, resolve, reject, timestamp, id } = queue.shift();
        this.processing.set(empresaId, processing + 1);
        this.stats.queueSizes.set(empresaId, queue.length);

        const queueTime = Date.now() - timestamp;
        this.stats.totalQueueTime += queueTime;

        console.log(`⚡ [${empresaId}] Processando mensagem. Tempo na fila: ${queueTime}ms`);

        try {
            // Buscar o pool da empresa (será integrado com botManager depois)
            const botManager = require('./botManager');
            const pool = botManager.poolsEmpresas ? botManager.poolsEmpresas.get(empresaId) : null;

            if (pool && pool.socket) {
                const result = await this.processWithTimeout(
                    () => pool.processMessage(messageData),
                    30000, // 30 segundos timeout
                    empresaId,
                    id
                );

                this.stats.totalProcessed++;
                resolve(result);
            } else {
                throw new Error('Bot não disponível');
            }

        } catch (error) {
            this.stats.totalErrors++;
            console.error(`❌ [${empresaId}] Erro no processamento:`, error);
            reject({ error: 'Falha no processamento', details: error.message });
        } finally {
            // Finalizar processamento
            const currentProcessing = this.processing.get(empresaId) || 0;
            this.processing.set(empresaId, Math.max(0, currentProcessing - 1));

            // Limpar timeout se existir
            if (this.processingTimeouts.has(id)) {
                clearTimeout(this.processingTimeouts.get(id));
                this.processingTimeouts.delete(id);
            }

            // Processar próxima mensagem
            setImmediate(() => this.processQueue(empresaId));
        }
    }

    // ✅ Processamento com timeout
    async processWithTimeout(processFunction, timeoutMs, empresaId, messageId) {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout de processamento excedido (${timeoutMs}ms)`));
            }, timeoutMs);

            this.processingTimeouts.set(messageId, timeout);

            try {
                const result = await processFunction();
                clearTimeout(timeout);
                this.processingTimeouts.delete(messageId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeout);
                this.processingTimeouts.delete(messageId);
                reject(error);
            }
        });
    }

    // ✅ Obter estatísticas da fila
    getQueueStats() {
        const queuesInfo = [];
        
        this.queues.forEach((queue, empresaId) => {
            queuesInfo.push({
                empresaId,
                queueSize: queue.length,
                processing: this.processing.get(empresaId) || 0,
                avgQueueTime: this.stats.totalProcessed > 0 
                    ? Math.round(this.stats.totalQueueTime / this.stats.totalProcessed)
                    : 0
            });
        });

        return {
            totalProcessed: this.stats.totalProcessed,
            totalErrors: this.stats.totalErrors,
            totalQueueTime: this.stats.totalQueueTime,
            maxQueueSize: this.stats.maxQueueSize,
            avgProcessingTime: this.stats.totalProcessed > 0 
                ? Math.round(this.stats.totalQueueTime / this.stats.totalProcessed)
                : 0,
            errorRate: this.stats.totalProcessed > 0 
                ? ((this.stats.totalErrors / this.stats.totalProcessed) * 100).toFixed(2)
                : 0,
            queues: queuesInfo,
            timestamp: Date.now()
        };
    }

    // ✅ Limpar fila da empresa (para reinicializações)
    clearQueue(empresaId) {
        if (this.queues.has(empresaId)) {
            const queue = this.queues.get(empresaId);
            
            // Rejeitar todas as promessas pendentes
            queue.forEach(({ reject }) => {
                reject(new Error('Fila limpa devido à reinicialização'));
            });

            this.queues.set(empresaId, []);
            this.stats.queueSizes.set(empresaId, 0);
            
            console.log(`🧹 [${empresaId}] Fila limpa. Mensagens removidas: ${queue.length}`);
        }
    }

    // ✅ Obter status específico da empresa
    getEmpresaQueueStatus(empresaId) {
        const queue = this.queues.get(empresaId);
        const processing = this.processing.get(empresaId) || 0;

        if (!queue) {
            return { exists: false };
        }

        return {
            exists: true,
            queueSize: queue.length,
            processing,
            nextMessage: queue.length > 0 ? {
                waitingTime: Date.now() - queue[0].timestamp,
                id: queue[0].id
            } : null
        };
    }

    // ✅ Gerar ID único para mensagem
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ✅ Health check das filas
    healthCheck() {
        const problems = [];
        
        this.queues.forEach((queue, empresaId) => {
            const processing = this.processing.get(empresaId) || 0;
            
            // Fila muito cheia
            if (queue.length > 50) {
                problems.push({
                    level: 'WARNING',
                    empresaId,
                    message: `Fila com ${queue.length} mensagens pendentes`,
                    metric: 'queue_size'
                });
            }
            
            // Processamento travado
            if (processing >= this.maxConcurrentPerEmpresa && queue.length > 0) {
                problems.push({
                    level: 'ERROR', 
                    empresaId,
                    message: `Processamento travado com ${processing} threads ativas`,
                    metric: 'processing_stuck'
                });
            }
        });

        return {
            status: problems.length === 0 ? 'HEALTHY' : 'ISSUES',
            problems,
            timestamp: Date.now()
        };
    }
}

// Instância global
const queueManager = new QueueManager();

module.exports = queueManager;

