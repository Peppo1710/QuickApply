require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const UserProfile = require('./models/UserProfile');

async function checkTokens() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get user by email
        const email = process.argv[2] || 'pradyumnshirsath1710@gmail.com';
        const user = await UserProfile.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log(`❌ No user found with email: ${email}`);
            process.exit(1);
        }

        console.log('📋 User Token Status:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Email: ${user.email}`);
        console.log(`Full Name: ${user.fullName}`);
        console.log(`Google ID: ${user.googleId || 'Not set'}`);
        console.log('');
        console.log(`Has Access Token: ${!!user.googleAccessToken ? '✅ YES' : '❌ NO'}`);
        if (user.googleAccessToken) {
            console.log(`  Length: ${user.googleAccessToken.length} characters`);
            console.log(`  Preview: ${user.googleAccessToken.substring(0, 30)}...`);
        }
        console.log('');
        console.log(`Has Refresh Token: ${!!user.googleRefreshToken ? '✅ YES' : '❌ NO'}`);
        if (user.googleRefreshToken) {
            console.log(`  Length: ${user.googleRefreshToken.length} characters`);
            console.log(`  Preview: ${user.googleRefreshToken.substring(0, 30)}...`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (!user.googleRefreshToken) {
            console.log('⚠️  WARNING: No refresh token found!');
            console.log('');
            console.log('📝 To fix this:');
            console.log('1. Logout from the frontend application');
            console.log('2. Clear browser localStorage for http://localhost:5173');
            console.log('3. Login again with Google (you will see a consent screen)');
            console.log('4. Save your profile');
            console.log('');
            console.log('The consent screen is required to get a refresh token.');
        } else {
            console.log('✅ Refresh token is present. Token refresh should work.');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

checkTokens();
