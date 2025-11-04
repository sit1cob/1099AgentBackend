require('dotenv').config();

console.log('Environment variables loaded:');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('MONGODB_URI length:', process.env.MONGODB_URI?.length);
console.log('MONGODB_URI type:', typeof process.env.MONGODB_URI);
console.log('First 20 chars:', process.env.MONGODB_URI?.substring(0, 20));
console.log('Has quotes?', process.env.MONGODB_URI?.includes('"') || process.env.MONGODB_URI?.includes("'"));
