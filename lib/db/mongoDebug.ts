import { connectDB, closeConnection } from './mongodb';

async function testConnection() {
  try {
    const db = await connectDB(); // Kết nối đến MongoDB
    console.log('Database:', db.databaseName); // In tên database kết nối thành công

    // Truy vấn danh sách học sinh từ collection 'students'
    const studentsCollection = db.collection('students');
    const students = await studentsCollection.find({}).toArray(); // Truy vấn tất cả học sinh

    if (students.length > 0) {
      console.log('Danh sách học sinh:');
      students.forEach(student => {
        console.log(`- ${student.name}`); // In tên học sinh (giả sử có trường 'name' trong collection)
      });
    } else {
      console.log('Không có học sinh nào trong database.');
    }

    await closeConnection(); // Đóng kết nối
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();
