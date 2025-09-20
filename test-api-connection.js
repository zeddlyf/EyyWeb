// Test script to verify API connection to local backend
const api = require('./src/API.js').default;

async function testConnection() {
  console.log('Testing API connection to local backend...');
  
  try {
    // Test basic connection
    const isConnected = await api.checkConnection();
    console.log('✅ Connection test:', isConnected ? 'SUCCESS' : 'FAILED');
    
    if (!isConnected) {
      console.log('❌ Cannot connect to backend. Make sure:');
      console.log('   1. Backend server is running on http://localhost:3000');
      console.log('   2. MongoDB is running and connected');
      console.log('   3. Environment variables are set (JWT_SECRET, MONGODB_URI)');
      return;
    }
    
    // Test registration endpoint
    console.log('\n📝 Testing registration endpoint...');
    try {
      const testUser = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'testpassword123',
        phoneNumber: '09123456789',
        role: 'commuter',
        address: {
          city: 'Naga',
          province: 'Camarines Sur'
        }
      };
      
      const result = await api.register(testUser);
      console.log('✅ Registration test: SUCCESS');
      console.log('   User ID:', result.user._id);
      
      // Test login
      console.log('\n🔐 Testing login endpoint...');
      const loginResult = await api.login('test@example.com', 'testpassword123');
      console.log('✅ Login test: SUCCESS');
      console.log('   Token received:', !!loginResult.token);
      
      // Test profile endpoint
      console.log('\n👤 Testing profile endpoint...');
      const profile = await api.getProfile();
      console.log('✅ Profile test: SUCCESS');
      console.log('   User name:', profile.firstName, profile.lastName);
      
      console.log('\n🎉 All API tests passed! Your frontend is successfully connected to the backend.');
      
    } catch (error) {
      console.log('⚠️  Registration/Login test failed:', error.message);
      console.log('   This might be expected if the test user already exists.');
    }
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Make sure your backend server is running:');
    console.log('   cd EyyBack && npm start');
    console.log('2. Check if the server is accessible at http://localhost:3000');
    console.log('3. Verify your MongoDB connection');
    console.log('4. Check backend console for any error messages');
  }
}

// Run the test
testConnection();
