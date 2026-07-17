const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    let user = await User.findOne({ email: 'sandeep@devmate.ai' });
    if (!user) {
      user = await User.create({
        name: 'Sandeep Gaud',
        email: 'sandeep@devmate.ai',
        password: 'password123',
        isVerified: true
      });
      console.log('Created test user:', user);
    } else {
      console.log('Found existing user:', user);
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
