// plansManager.js - Criar planos e restringir uso dentro desse limite do plano

class PlanManager {
    constructor() {
        this.plans = {
            basic: { 
                name: "Básico",
                maxMessagesPerMinute: 20,
                maxDailyMessages: 500,
                maxConnections: 1,
                queuePriority: 1,
                support: 'email',
                price: "R$ 99/mês",
                features: [
                    "Atendimento básico via WhatsApp",
                    "500 mensagens/dia",
                    "20 mensagens/minuto", 
                    "Suporte por email",
                    "1 conexão simultânea"
                ]
            },
            premium: { 
                name: "Premium", 
                maxMessagesPerMinute: 40,        // O DOBRO do básico
                maxDailyMessages: 1000,          // O DOBRO do básico  
                maxConnections: 3,
                queuePriority: 5,
                support: 'priority',
                price: "R$ 179/mês",
                features: [
                    "Atendimento premium via WhatsApp",
                    "1000 mensagens/dia", 
                    "40 mensagens/minuto",
                    "Suporte prioritário",
                    "3 conexões simultâneas",
                    "Prioridade na fila",
                    "Relatórios de uso"
                ]
            }
        };
    }

    getPlanConfig(planName) {
        return this.plans[planName] || this.plans.basic;
    }

    canSendMessage(empresaId, currentStats) {
        const config = this.getPlanConfig(currentStats.plan);
        
        // Verificar limite diário
        if (currentStats.dailyCount >= config.maxDailyMessages) {
            return { allowed: false, reason: 'daily_limit_exceeded', limit: config.maxDailyMessages };
        }

        // Verificar limite por minuto
        const oneMinuteAgo = Date.now() - 60000;
        const recentMessages = currentStats.minuteCounts.filter(time => time > oneMinuteAgo);
        
        if (recentMessages.length >= config.maxMessagesPerMinute) {
            return { allowed: false, reason: 'minute_limit_exceeded', limit: config.maxMessagesPerMinute };
        }

        return { allowed: true };
    }

    comparePlans() {
        return Object.keys(this.plans).map(planKey => ({
            ...this.plans[planKey],
            key: planKey
        }));
    }

    // Método para obter estatísticas de uso
    getUsageStats(stats, plan) {
        const config = this.getPlanConfig(plan);
        return {
            dailyUsage: stats.dailyCount || 0,
            dailyLimit: config.maxDailyMessages,
            dailyPercentage: ((stats.dailyCount || 0) / config.maxDailyMessages * 100).toFixed(1),
            minuteUsage: (stats.minuteCounts || []).length,
            minuteLimit: config.maxMessagesPerMinute,
            minutePercentage: (((stats.minuteCounts || []).length) / config.maxMessagesPerMinute * 100).toFixed(1)
        };
    }
}

class RateLimiter {
    constructor(planManager) {
        this.planManager = planManager;
        this.empresaStats = new Map();
    }

    initializeEmpresa(empresaId, plan = 'basic') {
        this.empresaStats.set(empresaId, {
            plan,
            dailyCount: 0,
            minuteCounts: [],
            lastReset: Date.now(),
            totalMessages: 0,
            limitExceededCount: 0
        });
    }

    checkLimit(empresaId) {
        // Inicializar se não existir
        if (!this.empresaStats.has(empresaId)) {
            this.initializeEmpresa(empresaId);
        }

        const stats = this.empresaStats.get(empresaId);
        const now = Date.now();

        // Reset diário (meia-noite)
        const today = new Date().toDateString();
        const lastResetDay = new Date(stats.lastReset).toDateString();
        
        if (today !== lastResetDay) {
            stats.dailyCount = 0;
            stats.minuteCounts = [];
            stats.lastReset = now;
        }

        // Limpar mensagens antigas (mais de 1 minuto)
        const oneMinuteAgo = now - 60000;
        stats.minuteCounts = stats.minuteCounts.filter(time => time > oneMinuteAgo);

        // Verificar limites
        const canSend = this.planManager.canSendMessage(empresaId, stats);
        
        if (canSend.allowed) {
            // Registrar nova mensagem
            stats.dailyCount++;
            stats.minuteCounts.push(now);
            stats.totalMessages++;
            return { allowed: true };
        } else {
            stats.limitExceededCount++;
            return { 
                allowed: false, 
                reason: canSend.reason, 
                limit: canSend.limit,
                currentUsage: canSend.reason === 'daily_limit_exceeded' ? stats.dailyCount : stats.minuteCounts.length
            };
        }
    }

    getEmpresaStats(empresaId) {
        if (!this.empresaStats.has(empresaId)) {
            return null;
        }
        
        const stats = this.empresaStats.get(empresaId);
        const usageStats = this.planManager.getUsageStats(stats, stats.plan);
        
        return {
            plan: stats.plan,
            planName: this.planManager.getPlanConfig(stats.plan).name,
            ...usageStats,
            totalMessages: stats.totalMessages,
            limitExceededCount: stats.limitExceededCount,
            lastReset: stats.lastReset
        };
    }

    changeEmpresaPlan(empresaId, newPlan) {
        if (!this.empresaStats.has(empresaId)) {
            this.initializeEmpresa(empresaId, newPlan);
        } else {
            const stats = this.empresaStats.get(empresaId);
            stats.plan = newPlan;
            // Reset contadores ao mudar de plano?
            // stats.dailyCount = 0;
            // stats.minuteCounts = [];
        }
        
        return this.planManager.getPlanConfig(newPlan);
    }

    // Método para debug
    getAllStats() {
        const allStats = {};
        this.empresaStats.forEach((stats, empresaId) => {
            allStats[empresaId] = this.getEmpresaStats(empresaId);
        });
        return allStats;
    }
}

// Instância global
const planManager = new PlanManager();
const rateLimiter = new RateLimiter(planManager);

module.exports = { planManager, rateLimiter };

// CONTINUAR DEPOIS PARTE DE PLANOS