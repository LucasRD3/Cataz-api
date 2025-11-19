// server.js (ROTA API COM MONGOOSE E PERSISTÊNCIA)

const express = require('express');
// ❌ REMOVIDOS: path e fs (Não usaremos mais o sistema de arquivos local)
const cors = require('cors'); 
const mongoose = require('mongoose'); // 💡 NOVO: Driver do Mongoose
const app = express();

// --- Configuração CORS ---
app.use(cors()); 

// --- 1. CONFIGURAÇÃO DO MONGOOSE E CONEXÃO ---

// A URI de conexão é injetada pelo Vercel como uma variável de ambiente secreta
const MONGODB_URI = process.env.MONGODB_URI; 

if (!MONGODB_URI) {
    console.error('ERRO: A variável de ambiente MONGODB_URI não está definida.');
    // Para ambientes de desenvolvimento/teste, você pode querer um fallback ou lançar erro:
    // throw new Error('MONGODB_URI must be defined.');
}

// Criamos um cache para a conexão, essencial para funções Serverless
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        console.log('=> Usando conexão de DB em cache');
        return cachedDb;
    }

    try {
        // Opções para Serverless: desativa o buffering
        const opts = { bufferCommands: false }; 
        const dbConnection = await mongoose.connect(MONGODB_URI, opts);
        cachedDb = dbConnection;
        console.log('=> Conexão com MongoDB Atlas estabelecida');
        return dbConnection;
    } catch (error) {
        console.error('ERRO ao conectar ao MongoDB Atlas:', error);
        throw error;
    }
}

// --- 2. DEFINIÇÃO DO MODELO MONGOOSE (SCHEMA) ---
const bannerSchema = new mongoose.Schema({
    // A URL deve apontar para o arquivo de imagem hospedado externamente (CDN/Storage)
    url: { type: String, required: true }, 
    // Campo para controlar se o banner deve ser exibido ou não
    active: { type: Boolean, default: true }, 
    createdAt: { type: Date, default: Date.now },
});

// A Vercel recomenda definir o modelo na função Serverless.
const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);


// --- 3. ROTA API PARA OBTER OS BANNERS ATIVOS ---
// Esta rota agora retorna a URL de banners com 'active: true' no MongoDB.
app.get('/api/banners', async (req, res) => {
    try {
        await connectToDatabase(); // Conecta ao DB (ou usa cache)

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


// --- 4. ROTA DE LIMPEZA (CHAMADA PELO VERCEL CRON JOB ÀS 23:59) ---
// Esta rota é o alvo do agendamento configurado no vercel.json.
app.get('/api/cleanup-banners', async (req, res) => {
    try {
        await connectToDatabase(); // Conecta ao DB (ou usa cache)

        // Lógica de "Apagamento Permanente": 
        // 1. Encontra todos os banners que estão ativos no momento.
        // 2. Altera o campo 'active' para false (desativação).
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