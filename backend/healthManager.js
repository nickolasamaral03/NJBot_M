// backend/healthManager.js
class HealthManager {
    constructor() {
        this.metrics = {
            startTime: Date.now(),
            lastCheck: Date.now(),
            system: {
                uptime: 0,
                memory: {},
                cpu: {},
                eventLoop: {}
            },
            empresas: new Map(),
            services: {
                whatsapp: new Map(),
                gemini: new Map(),
                database: {}
            },
            alerts: [],
            incidents: []
        };

        this.thresholds = {
            memory: 85, // 85% de uso de memória
            cpu: 80,    // 80% de uso de CPU
            queue: 50,  // 50 mensagens na fila
            errorRate: 5, // 5% de taxa de erro
            responseTime: 5000 // 5 segundos
        };

        this.startMonitoring();
    }

    // ✅ Iniciar monitoramento contínuo
    startMonitoring() {
        // Coletar métricas a cada 30 segundos
        this.monitoringInterval = setInterval(() => {
            this.collectSystemMetrics();
            this.checkThresholds();
            this.cleanOldData();
        }, 30000);

        // Coletar métricas imediatamente
        this.collectSystemMetrics();
    }

    // ✅ Coletar métricas do sistema
    collectSystemMetrics() {
        const now = Date.now();
        
        // Métricas básicas do sistema
        this.metrics.system.uptime = now - this.metrics.startTime;
        this.metrics.system.memory = this.getMemoryUsage();
        this.metrics.system.cpu = this.getCpuUsage();
        this.metrics.system.eventLoop = this.getEventLoopMetrics();
        
        this.metrics.lastCheck = now;

        console.log(`📊 Health check realizado - Memória: ${this.metrics.system.memory.usage}%`);
    }

    // ✅ Registrar métricas de empresa
    registerEmpresa(empresaId, nome) {
        this.metrics.empresas.set(empresaId, {
            nome,
            registeredAt: Date.now(),
            messages: {
                total: 0,
                success: 0,
                errors: 0,
                lastActivity: Date.now()
            },
            connections: {
                status: 'disconnected',
                lastStatusChange: Date.now(),
                qrGenerations: 0
            },
            performance: {
                avgResponseTime: 0,
                lastResponseTime: 0
            }
        });
    }

    // ✅ Atualizar métricas de mensagem
    updateMessageMetrics(empresaId, success = true, responseTime = 0) {
        const empresa = this.metrics.empresas.get(empresaId);
        if (!empresa) return;

        empresa.messages.total++;
        empresa.messages.lastActivity = Date.now();

        if (success) {
            empresa.messages.success++;
        } else {
            empresa.messages.errors++;
        }

        // Calcular tempo médio de resposta
        if (responseTime > 0) {
            empresa.performance.lastResponseTime = responseTime;
            const total = empresa.performance.avgResponseTime * (empresa.messages.success - 1) + responseTime;
            empresa.performance.avgResponseTime = total / empresa.messages.success;
        }
    }

    // ✅ Atualizar status de conexão
    updateConnectionStatus(empresaId, status, qrGenerated = false) {
        const empresa = this.metrics.empresas.get(empresaId);
        if (!empresa) return;

        const oldStatus = empresa.connections.status;
        empresa.connections.status = status;
        empresa.connections.lastStatusChange = Date.now();

        if (qrGenerated) {
            empresa.connections.qrGenerations++;
        }

        // Alertar sobre mudança de status
        if (oldStatus !== status) {
            this.addAlert({
                level: status === 'connected' ? 'INFO' : 'WARNING',
                type: 'connection_status',
                empresaId,
                message: `Status alterado: ${oldStatus} → ${status}`,
                data: { oldStatus, newStatus: status }
            });
        }
    }

    // ✅ Registrar saúde do serviço
    updateServiceHealth(service, empresaId, health) {
        if (!this.metrics.services[service]) {
            this.metrics.services[service] = new Map();
        }

        this.metrics.services[service].set(empresaId, {
            ...health,
            lastUpdate: Date.now()
        });
    }

    // ✅ Verificar limites e thresholds
    checkThresholds() {
        const problems = [];

        // Verificar uso de memória
        if (this.metrics.system.memory.usage > this.thresholds.memory) {
            problems.push({
                level: 'CRITICAL',
                type: 'memory_usage',
                message: `Uso de memória alto: ${this.metrics.system.memory.usage}%`,
                metric: 'memory',
                value: this.metrics.system.memory.usage
            });
        }

        // Verificar empresas inativas
        this.metrics.empresas.forEach((empresa, empresaId) => {
            const inactivityTime = Date.now() - empresa.messages.lastActivity;
            
            // Empresa inativa há mais de 1 hora
            if (inactivityTime > 3600000 && empresa.messages.total > 0) {
                problems.push({
                    level: 'WARNING',
                    type: 'inactive_empresa',
                    empresaId,
                    message: `Empresa inativa há ${Math.round(inactivityTime / 60000)} minutos`,
                    metric: 'inactivity',
                    value: inactivityTime
                });
            }

            // Alta taxa de erro
            const errorRate = empresa.messages.total > 0 
                ? (empresa.messages.errors / empresa.messages.total) * 100 
                : 0;

            if (errorRate > this.thresholds.errorRate && empresa.messages.total >= 10) {
                problems.push({
                    level: 'ERROR',
                    type: 'high_error_rate',
                    empresaId,
                    message: `Taxa de erro alta: ${errorRate.toFixed(1)}%`,
                    metric: 'error_rate',
                    value: errorRate
                });
            }

            // Tempo de resposta alto
            if (empresa.performance.avgResponseTime > this.thresholds.responseTime && empresa.messages.success >= 5) {
                problems.push({
                    level: 'WARNING',
                    type: 'slow_response',
                    empresaId,
                    message: `Tempo de resposta médio alto: ${empresa.performance.avgResponseTime.toFixed(0)}ms`,
                    metric: 'response_time',
                    value: empresa.performance.avgResponseTime
                });
            }
        });

        // Processar problemas encontrados
        problems.forEach(problem => {
            this.addAlert(problem);
        });

        return problems;
    }

    // ✅ Adicionar alerta
    addAlert(alert) {
        const fullAlert = {
            id: this.generateAlertId(),
            timestamp: Date.now(),
            resolved: false,
            resolvedAt: null,
            ...alert
        };

        this.metrics.alerts.unshift(fullAlert);
        
        // Manter apenas últimos 100 alertas
        this.metrics.alerts = this.metrics.alerts.slice(0, 100);

        // Log do alerta
        console.log(`🚨 ${fullAlert.level} - ${fullAlert.message}`);

        return fullAlert;
    }

    // ✅ Resolver alerta
    resolveAlert(alertId, resolution = 'Manual') {
        const alert = this.metrics.alerts.find(a => a.id === alertId && !a.resolved);
        if (alert) {
            alert.resolved = true;
            alert.resolvedAt = Date.now();
            alert.resolution = resolution;
        }
    }

    // ✅ Obter relatório de saúde
    getHealthReport() {
        const totalEmpresas = this.metrics.empresas.size;
        const connectedEmpresas = Array.from(this.metrics.empresas.values())
            .filter(e => e.connections.status === 'connected').length;

        const activeAlerts = this.metrics.alerts.filter(a => !a.resolved);
        const criticalAlerts = activeAlerts.filter(a => a.level === 'CRITICAL');

        return {
            status: criticalAlerts.length > 0 ? 'CRITICAL' : 
                   activeAlerts.length > 0 ? 'WARNING' : 'HEALTHY',
            summary: {
                uptime: this.metrics.system.uptime,
                totalEmpresas,
                connectedEmpresas,
                activeAlerts: activeAlerts.length,
                criticalAlerts: criticalAlerts.length,
                totalMessages: this.getTotalMessages(),
                errorRate: this.getGlobalErrorRate()
            },
            system: this.metrics.system,
            alerts: activeAlerts.slice(0, 10), // Últimos 10 alertas ativos
            timestamp: Date.now()
        };
    }

    // ✅ Obter métricas específicas da empresa
    getEmpresaHealth(empresaId) {
        const empresa = this.metrics.empresas.get(empresaId);
        if (!empresa) return null;

        const errorRate = empresa.messages.total > 0 
            ? (empresa.messages.errors / empresa.messages.total) * 100 
            : 0;

        return {
            ...empresa,
            metrics: {
                errorRate: errorRate.toFixed(1),
                successRate: (100 - errorRate).toFixed(1),
                activityLevel: this.getActivityLevel(empresa.messages.lastActivity),
                connectionStability: this.getConnectionStability(empresaId)
            }
        };
    }

    // ✅ Métricas do sistema (simuladas - em produção usar bibliotecas específicas)
    getMemoryUsage() {
        const used = process.memoryUsage();
        return {
            usage: Math.round((used.heapUsed / used.heapTotal) * 100),
            heapUsed: Math.round(used.heapUsed / 1024 / 1024),
            heapTotal: Math.round(used.heapTotal / 1024 / 1024),
            rss: Math.round(used.rss / 1024 / 1024)
        };
    }

    getCpuUsage() {
        // Em produção, usar library como 'os-utils' ou 'pidusage'
        return {
            usage: 0, // Será implementado com biblioteca específica
            cores: require('os').cpus().length
        };
    }

    getEventLoopMetrics() {
        const start = Date.now();
        setTimeout(() => {
            this.metrics.system.eventLoop.latency = Date.now() - start;
        }, 0);

        return {
            latency: this.metrics.system.eventLoop.latency || 0
        };
    }

    // ✅ Métodos auxiliares
    getTotalMessages() {
        let total = 0;
        this.metrics.empresas.forEach(empresa => {
            total += empresa.messages.total;
        });
        return total;
    }

    getGlobalErrorRate() {
        const total = this.getTotalMessages();
        let errors = 0;
        
        this.metrics.empresas.forEach(empresa => {
            errors += empresa.messages.errors;
        });

        return total > 0 ? (errors / total * 100).toFixed(1) : 0;
    }

    getActivityLevel(lastActivity) {
        const inactivity = Date.now() - lastActivity;
        if (inactivity < 300000) return 'high'; // 5 minutos
        if (inactivity < 1800000) return 'medium'; // 30 minutos
        return 'low';
    }

    getConnectionStability(empresaId) {
        const empresa = this.metrics.empresas.get(empresaId);
        if (!empresa) return 'unknown';

        const statusChanges = empresa.connections.qrGenerations;
        if (statusChanges === 0) return 'excellent';
        if (statusChanges <= 3) return 'good';
        if (statusChanges <= 10) return 'fair';
        return 'poor';
    }

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    cleanOldData() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        // Limpar alertas resolvidos antigos
        this.metrics.alerts = this.metrics.alerts.filter(alert => 
            !alert.resolved || alert.resolvedAt > oneWeekAgo
        );

        // Limpar incidentes antigos
        this.metrics.incidents = this.metrics.incidents.filter(incident =>
            incident.timestamp > oneWeekAgo
        );
    }

    // ✅ Parar monitoramento
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }
}

// Instância global
const healthManager = new HealthManager();

// Graceful shutdown
process.on('SIGINT', () => {
    healthManager.stopMonitoring();
    process.exit(0);
});

process.on('SIGTERM', () => {
    healthManager.stopMonitoring();
    process.exit(0);
});

module.exports = healthManager;