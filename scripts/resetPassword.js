require('dotenv').config();
const db = require('../models');
const bcrypt = require('bcrypt');

const email = process.argv[2] || 'belenzoshyr@gmail.com';
const newPassword = process.argv[3] || 'TempPass123!';

(async ()=>{
  try{
    await db.sequelize.authenticate();
    const user = await db.User.findOne({ where: { email } });
    if(!user){
      console.error('User not found:', email); process.exit(1);
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.User.update({ password: hashed }, { where: { id: user.id }});
    console.log(`Password for ${email} updated to: ${newPassword}`);
    process.exit(0);
  }catch(e){
    console.error('Error resetting password', e);
    process.exit(1);
  }
})();
