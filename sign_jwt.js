// sign_jwt.js
const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// set the subject and secret
const subject = process.env.SUB || "testuser";
const secret = process.env.JWT_SECRET || "mydevsecret"; // replace with the same value you put into wrangler secret

const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const payload = base64url(JSON.stringify({ sub: subject, iat: Math.floor(Date.now() / 1000) }));
const signingInput = `${header}.${payload}`;

const sig = crypto.createHmac("sha256", secret).update(signingInput).digest("base64")
  .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

console.log(`${signingInput}.${sig}`);
