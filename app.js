const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

const app = express();
const SECRET_KEY = 'votre_clé_secrète_pour_jwt';
const RECORD_PATH = path.join(__dirname, 'records');
const HLS_PATH = path.join(__dirname, 'hls');

// Vérification du token pour accéder aux routes protégées
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Enregistrement du flux RTSP toutes les 2 minutes
setInterval(() => {
    const output = `${RECORD_PATH}/${Date.now()}.mp4`;

    ffmpeg('rtsp://IXlbP3:Amliy0FiMe5M@192.168.0.10:554/live/ch0')
        .duration(20) // durée en secondes
        .on('end', () => console.log('Enregistrement terminé'))
        .on('error', (err) => console.error(err))
        .save(output);
}, 120 * 1000);

// Compilation des vidéos en un fichier HLS toutes les heures
setInterval(() => {
    const files = fs.readdirSync(RECORD_PATH);
    const mergedFile = `${HLS_PATH}/${Date.now()}.m3u8`;

    const command = ffmpeg();

    files.forEach((file) => {
        command.input(`${RECORD_PATH}/${file}`);
    });

    command
        .on('end', () => {
            console.log('Compilation terminée');
            // Suppression des fichiers source
            files.forEach((file) => {
                fs.unlinkSync(`${RECORD_PATH}/${file}`);
            });
        })
        .on('error', (err) => console.error(err))
        .save(mergedFile);
}, 3600 * 1000);

// Route pour afficher toutes les vidéos
app.get('/camera', authenticateToken, (req, res) => {
    const files = fs.readdirSync(HLS_PATH);
    res.json(files);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
