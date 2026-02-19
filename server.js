const http = require("http");
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
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
    } else if (req.method === 'POST' && req.url === '/sendEmails') {
        let data = '';

        req.on('data', chunk => {
            data += chunk;
        });

        req.on('end', async () => {
            try {
                const payload = JSON.parse(data);
                const results = await handleSendEmails(payload);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ results }));
            } catch (error) {
                console.error('Error sending emails:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } else if (req.url === '/email-tool') {
        fs.readFile(path.join(__dirname, "email-tool.html"))
            .then(contents => {
                res.setHeader("Content-Type", "text/html");
                res.writeHead(200);
                res.end(contents);
            })
            .catch(err => {
                res.writeHead(500);
                res.end('Erreur lors du chargement de la page.');
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

async function handleSendEmails(payload) {
    const { smtp, subject, body, recipients, emailColumn, columns } = payload;

    const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log('Connexion SMTP vérifiée.');

    const results = [];

    for (const recipient of recipients) {
        const email = recipient[emailColumn];
        if (!email) {
            results.push({ email: '(vide)', success: false, error: 'Adresse email manquante' });
            continue;
        }

        // Replace placeholders in subject and body
        let personalizedSubject = subject;
        let personalizedBody = body;

        for (const col of columns) {
            const regex = new RegExp('\\{\\{' + col + '\\}\\}', 'g');
            const value = recipient[col] !== undefined ? String(recipient[col]) : '';
            personalizedSubject = personalizedSubject.replace(regex, value);
            personalizedBody = personalizedBody.replace(regex, value);
        }

        try {
            await transporter.sendMail({
                from: smtp.user,
                to: email,
                subject: personalizedSubject,
                text: personalizedBody,
            });
            results.push({ email, success: true });
            console.log(`Email envoyé à ${email}`);
        } catch (err) {
            results.push({ email, success: false, error: err.message });
            console.error(`Erreur envoi à ${email}:`, err.message);
        }
    }

    return results;
}

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
    console.log(`Outil email disponible sur http://${host}:${port}/email-tool`);
});
