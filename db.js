// db.js

const mongoose = require('mongoose');

// A URI de conexão é injetada pelo Vercel como uma variável de ambiente secreta
const MONGODB_URI = process.env.MONGODB_URI; 

if (!MONGODB_URI) {
    throw new Error(
        'Por favor, defina a variável de ambiente MONGODB_URI no Vercel.'
    );
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

module.exports = connectToDatabase;