// Minimal entrypoint for Vercel Pages Router
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello from Vercel Pages Router' });
}