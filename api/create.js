import fetch from 'node-fetch';

export default async function handler(req, res) {
    // --- KONFIGURASI PENTING (ISI DI SINI) ---
    const PANEL_URL = "https://myserver-panel.banditflow.cfd"; // Tanpa garis miring di akhir
    const API_KEY = "ptla_gjYPEvleIK3NPkPemrDwF7Z57HP2bA6Z35y67E4FLZc"; // API Key Admin (ptla)
    // -----------------------------------------

    // Setup Header agar bisa diakses dari frontend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const data = req.body;

        // 1. Validasi
        if (!data.username || !data.email || !data.password) {
            throw new Error('Data User tidak lengkap!');
        }

        // 2. Buat User
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
        if (!userRes.ok) throw new Error(userData.errors?.[0]?.detail || "Gagal membuat User");
        
        const userId = userData.attributes.id;

        // 3. Buat Server
        const serverRes = await fetch(`${PANEL_URL}/api/application/servers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                name: data.server_name,
                user: userId,
                nest: 5,
                egg: 18,
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
                    locations: [1], // Default Node ID 1
                    dedicated_ip: false,
                    port_range: []
                }
            })
        });

        const serverData = await serverRes.json();
        if (!serverRes.ok) throw new Error("User dibuat, tapi Server Gagal: " + (serverData.errors?.[0]?.detail || "Unknown error"));

        // 4. Sukses
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
