(async()=>{
  require('dotenv').config();
  const jwt = require('jsonwebtoken');
  const fetch = global.fetch || (await import('node-fetch')).default;
  const fs = require('fs');

  const token = jwt.sign({id:1}, process.env.JWT_SECRET);
  console.log('Using token:', token.slice(0,20)+'...');

  const FormData = (await import('formdata-node')).FormData;
  const form = new FormData();
  form.append('description','Test Book from script');
  form.append('cost_price','10.00');
  form.append('sell_price','15.00');
  form.append('quantity','5');
  // no images

  const headers = Object.assign({'Authorization': 'Bearer '+token}, form.headers || {});
  const res = await fetch('http://localhost:3000/api/v1/items',{ method: 'POST', body: form, headers });
  const text = await res.text();
  console.log('STATUS', res.status);
  console.log(text);
})().catch(e=>{console.error(e); process.exit(1)})
