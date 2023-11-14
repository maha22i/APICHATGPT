const http = require("http");
const fs = require('fs').promises;
const path = require('path');
const host = 'localhost';
const port = 3000;

const requestListener = function (req, res) {
    if (req.method === 'POST' && req.url === '/submitForm') {
        let data = '';

        req.on('data', chunk => {
            data += chunk;
        });

        req.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                saveToJSONFile(jsonData);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Données recues et enregistrées.');
            } catch (error) {
                console.error('Error parsing JSON:', error);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Error parsing JSON.');
            }
        });
    } else {
        fs.readFile(path.join(__dirname, "index.html"))
            .then(contents => {
                res.setHeader("Content-Type", "text/html");
                res.writeHead(200);
                res.end(contents);
            })
            .catch(err => {
                res.writeHead(500);
                res.end(err);
                return;
            });
    }
};

function saveToJSONFile(data) {
    const filePath = path.join(__dirname, 'data.json');

    fs.readFile(filePath)
        .then(contents => {
            const jsonData = JSON.parse(contents);
            jsonData.push(data);
            return fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
        })
        .catch(error => {
            if (error.code === 'ENOENT') {
                return fs.writeFile(filePath, JSON.stringify([data], null, 2));
            } else {
                throw error;
            }
        })
        .then(() => console.log('Les données ont bien été enregistrées dans le fichier data.json'))
        .catch(error => console.error('Erreur d enregistrement des données :', error));
}

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
