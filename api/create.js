// api/create.js
// Ini berjalan di Server Vercel (Backend), bukan di Browser. Aman dari CORS.

export default async function handler(req, res) {
    // 1. Konfigurasi (GANTI INI)
    const PANEL_URL = "https://myserver-panel.banditflow.cfd"; // Tanpa garis miring di akhir
    const API_KEY = "ptla_gjYPEvleIK3NPkPemrDwF7Z57HP2bA6Z35y67E4FLZc"; // API Key Admin (ptla)
    
    // ---------------------------------------------------------

    // Setup Header CORS agar bisa diakses dari frontend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const data = req.body; // Vercel otomatis parse JSON body

        // Validasi
        if (!data.username || !data.email || !data.password) {
            return res.status(400).json({ error: 'Data tidak lengkap (Username/Email/Password)' });
        }

        // --- STEP 1: CREATE USER ---
        const userRes = await fetch(`${PANEL_URL}/api/application/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                email: data.email,
                username: data.username,
                first_name: data.username,
                last_name: "GruuStore",
                password: data.password
            })
        });

        const userData = await userRes.json();

        if (!userRes.ok) {
            throw new Error(userData.errors?.[0]?.detail || "Gagal membuat User");
        }

        const userId = userData.attributes.id;

        // --- STEP 2: CREATE SERVER ---
        const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                name: data.server_name || `Panel ${data.username}`,
                user: userId,
                nest: 5, // Default Nest (Sesuaikan jika perlu)
                egg: 18, // Default Egg (NodeJS)
                docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
                startup: "if [ -f /home/container/package.json ]; then npm install; fi; npm start",
                environment: {
                    "USER_UPLOAD": "0",
                    "AUTO_UPDATE": "0",
                    "JS_FILE": "index.js"
                },
                limits: {
                    memory: parseInt(data.ram),
                    swap: 0,
                    disk: parseInt(data.disk),
                    io: 500,
                    cpu: parseInt(data.cpu)
                },
                feature_limits: {
                    databases: 0,
                    backups: 0,
                    allocations: 1
                },
                deploy: {
                    locations: [1], // Node ID 1 (Ganti jika beda)
                    dedicated_ip: false,
                    port_range: []
                }
            })
        });

        const serverData = await serverRes.json();

        if (!serverRes.ok) {
            // Jika server gagal, beri info tapi user sudah terbuat
            throw new Error(`User ID ${userId} dibuat, tapi Server Gagal: ${serverData.errors?.[0]?.detail}`);
        }

        // --- SUKSES ---
        return res.status(200).json({
            success: true,
            data: {
                panel_url: PANEL_URL,
                username: data.username,
                password: data.password,
                server_name: data.server_name,
                ram: data.ram,
                cpu: data.cpu
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
