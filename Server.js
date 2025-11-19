// Server.js

const express = require('express');
const cors = require('cors'); 
const mongoose = require('mongoose'); 
const app = express();

// 💡 Importa a lógica de conexão com cache de db.js
const connectToDatabase = require('./db'); 

// --- Configuração CORS ---
app.use(cors()); 

// --- 1. DEFINIÇÃO DO MODELO MONGOOSE (SCHEMA) ---
// O modelo deve ser definido aqui, após a importação do Mongoose.
const bannerSchema = new mongoose.Schema({
    // A URL deve apontar para o arquivo de imagem hospedado externamente (CDN/Storage)
    url: { type: String, required: true }, 
    // Campo para controlar se o banner deve ser exibido ou não
    active: { type: Boolean, default: true }, 
    createdAt: { type: Date, default: Date.now },
});

// Define o modelo (necessário verificar se já existe em Serverless)
const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);


// --- 2. ROTA API PARA OBTER OS BANNERS ATIVOS ---
// Esta rota retorna a URL de banners com 'active: true' no MongoDB.
app.get('/api/banners', async (req, res) => {
    try {
        await connectToDatabase(); // Conecta ao DB (ou usa cache de db.js)

        // Consulta: Obtém apenas os banners ATIVOS e retorna apenas a URL
        const activeBanners = await Banner.find({ active: true }, 'url -_id'); 
        
        // Mapeia o resultado para um array de strings (URLs)
        const finalBannerUrls = activeBanners.map(banner => banner.url);

        if (finalBannerUrls.length === 0) {
            console.log("Nenhum banner ativo encontrado no MongoDB.");
        }

        res.status(200).json(finalBannerUrls);
    } catch (error) {
        console.error('Erro ao carregar banners do DB:', error);
        res.status(500).json({ error: 'Falha ao carregar banners.' });
    }
});


// --- 3. ROTA DE LIMPEZA (CHAMADA PELO VERCEL CRON JOB) ---
// Esta rota é o alvo do agendamento configurado no vercel.json.
app.get('/api/cleanup-banners', async (req, res) => {
    try {
        await connectToDatabase(); // Conecta ao DB (ou usa cache de db.js)

        // Lógica de "Apagamento Permanente": 
        // Encontra todos os banners que estão ativos e altera o campo 'active' para false.
        const result = await Banner.updateMany(
            { active: true }, 
            { $set: { active: false } }
        );
        
        console.log(`Rotina de limpeza executada. Banners desativados: ${result.modifiedCount}`);

        res.status(200).json({ 
            message: 'Rotina de limpeza de banners concluída com sucesso.',
            count: result.modifiedCount
        });
    } catch (error) {
        console.error('❌ ERRO na rotina de limpeza:', error);
        res.status(500).json({ error: 'Falha na rotina de limpeza.' });
    }
});


// --- EXPORTAÇÃO PARA O VERCEL (FUNÇÃO SERVERLESS) ---
module.exports = app;