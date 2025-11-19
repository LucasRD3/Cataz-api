// db.js (Novo Arquivo)
const mongoose = require('mongoose');

// O MONGODB_URI é injetado pelo Vercel
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Por favor, defina a variável de ambiente MONGODB_URI no Vercel.'
  );
}

// Criamos uma função de conexão que só roda se o banco ainda não estiver conectado.
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    console.log('=> Usando conexão de banco de dados em cache');
    return cachedDb;
  }

  // Opções de conexão para Serverless
  const opts = {
    bufferCommands: false, // Desativa o buffering para evitar problemas em serverless
  };

  try {
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