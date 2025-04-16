import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = "school";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectDB(): Promise<Db> {
  // Nếu đã có kết nối, trả về database
  if (cachedDb) return cachedDb;

  // Nếu chưa có kết nối, tạo kết nối mới
  if (!cachedClient) {
    console.log('Connecting to MongoDB...');
    cachedClient = new MongoClient(uri);
    try {
      await cachedClient.connect();
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB', error);
      throw new Error('MongoDB connection failed');
    }
  }

  // Lấy database từ client
  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}

// Hàm đóng kết nối khi cần thiết
export async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('MongoDB connection closed');
  }
}
