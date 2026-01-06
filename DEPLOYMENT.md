# Guida al Deployment su Raspberry Pi

Questa guida ti aiuterà a pubblicare il client del gioco sul tuo Raspberry Pi e renderlo accessibile via web da qualsiasi parte.

## Prerequisiti

1. Docker e Docker Compose installati sul Raspberry Pi
2. Accesso SSH al Raspberry Pi
3. (Opzionale ma consigliato) Tailscale installato e configurato sul Raspberry Pi

## Opzione A: Deployment con Tailscale (Consigliato) 🌐

Tailscale è la soluzione più semplice e sicura per rendere il servizio accessibile da qualsiasi parte senza configurare port forwarding o IP pubblici.

### Vantaggi di Tailscale:

- ✅ Nessun port forwarding necessario
- ✅ Accesso sicuro tramite VPN mesh
- ✅ Dominio statico (es: `frasma.tail57cb32.ts.net`)
- ✅ Funziona anche dietro NAT/firewall
- ✅ Crittografia end-to-end

### 1.1 Installare Tailscale sul Raspberry Pi

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 1.2 Ottenere il dominio Tailscale

Dopo aver configurato Tailscale, otterrai un dominio come `frasma.tail57cb32.ts.net`. Puoi verificarlo con:

```bash
tailscale status
```

### 1.3 Configurare il file .env con Tailscale

Crea il file `.env` usando il template:

```bash
cp env.template .env
```

Modifica il file `.env` e imposta `VITE_API_URL` con il tuo dominio Tailscale:

```env
VITE_API_URL=http://frasma.tail57cb32.ts.net:3300
```

### 1.4 Deployment rapido con script

```bash
./deploy.sh frasma.tail57cb32.ts.net
```

Oppure manualmente:

```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### 1.5 Accesso al client

Il client sarà accessibile su:

```
http://frasma.tail57cb32.ts.net:6609
```

**Nota**: Qualsiasi dispositivo connesso alla tua rete Tailscale potrà accedere al servizio senza configurazioni aggiuntive!

---

## Opzione B: Deployment con IP Locale

Se preferisci usare l'IP locale del Raspberry Pi (solo accesso dalla rete locale):

## Passo 1: Preparare il Raspberry Pi

### 1.1 Verificare l'installazione di Docker

```bash
docker --version
docker-compose --version
```

### 1.2 Ottenere l'IP del Raspberry Pi

```bash
hostname -I
# oppure
ip addr show
```

Annota l'IP (es: `192.168.1.100`)

## Passo 2: Configurare le Variabili d'Ambiente

### 2.1 Creare il file .env

Copia il file `env.template` e crea un file `.env`:

```bash
cp env.template .env
```

### 2.2 Modificare il file .env

Apri il file `.env` e modifica `VITE_API_URL` con l'IP del tuo Raspberry Pi:

```env
VITE_API_URL=http://192.168.68.106:3300
```

**IMPORTANTE**:

- Per accesso solo dalla rete locale: usa l'IP locale (es: `192.168.68.106`)
- Per accesso da internet: usa Tailscale (consigliato) o configura port forwarding sul router

## Passo 3: Trasferire il Codice sul Raspberry Pi

### Opzione A: Usando Git (consigliato)

```bash
# Sul Raspberry Pi
git clone <your-repo-url>
cd cards_against_humanity_be
```

### Opzione B: Usando SCP

```bash
# Dal tuo computer locale
scp -r /path/to/project pi@raspberry-pi-ip:/home/pi/
```

## Passo 4: Build e Avvio dei Container

### 4.1 Build delle immagini

```bash
docker-compose -f docker-compose.prod.yml build
```

### 4.2 Avvio dei servizi

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4.3 Verificare che i container siano in esecuzione

```bash
docker-compose -f docker-compose.prod.yml ps
```

Dovresti vedere tre container in esecuzione: `api`, `client`, e `db`.

## Passo 5: Configurare il Firewall

**Nota**: Se usi Tailscale, questo passo è opzionale perché Tailscale gestisce automaticamente le connessioni.

### 5.1 Su Raspberry Pi OS (se usi UFW)

```bash
sudo ufw allow 3300/tcp  # Porta API
sudo ufw allow 6609/tcp  # Porta Client
sudo ufw reload
```

### 5.2 Su Raspberry Pi OS (se usi iptables)

```bash
sudo iptables -A INPUT -p tcp --dport 3300 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6609 -j ACCEPT
sudo iptables-save
```

## Passo 6: Configurare il Router (solo se NON usi Tailscale)

**⚠️ Se usi Tailscale, salta questo passo!** Tailscale non richiede port forwarding.

### 6.1 Port Forwarding

Accedi al pannello di controllo del tuo router e configura il port forwarding:

- **Porta esterna 80** → **IP Raspberry Pi:6609** (per il client)
- **Porta esterna 3300** → **IP Raspberry Pi:3300** (per l'API)

**NOTA**: Alcuni ISP bloccano la porta 80. In tal caso, usa una porta diversa (es: 8080) e modifica `CLIENT_PORT` nel file `.env`.

### 6.2 Ottenere un IP Pubblico Statico (opzionale)

Contatta il tuo ISP per un IP pubblico statico, oppure usa un servizio DDNS (Dynamic DNS) come:

- DuckDNS
- No-IP
- Cloudflare

## Passo 7: Testare l'Accesso

### 7.1 Con Tailscale

Apri un browser su qualsiasi dispositivo connesso a Tailscale e vai a:

```
http://frasma.tail57cb32.ts.net:6609
```

Sostituisci `frasma.tail57cb32.ts.net` con il tuo dominio Tailscale.

### 7.2 Dalla rete locale (senza Tailscale)

Apri un browser e vai a:

```
http://192.168.68.106:6609
```

Sostituisci `192.168.68.106` con l'IP del tuo Raspberry Pi.

### 7.3 Da internet (solo con port forwarding configurato)

Se hai configurato il port forwarding sul router:

```
http://your-public-ip:6609
```

## Passo 8: Configurare HTTPS (Opzionale ma Consigliato)

Per una configurazione più sicura, puoi usare un reverse proxy con Let's Encrypt:

### 8.1 Installare Nginx sul Raspberry Pi

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### 8.2 Configurare Nginx come Reverse Proxy

Crea un file di configurazione `/etc/nginx/sites-available/cards-game`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:6609;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:3300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 8.3 Abilitare il sito e ottenere certificato SSL

```bash
sudo ln -s /etc/nginx/sites-available/cards-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d yourdomain.com
```

## Comandi Utili

### Visualizzare i log

```bash
# Log di tutti i servizi
docker-compose -f docker-compose.prod.yml logs

# Log di un servizio specifico
docker-compose -f docker-compose.prod.yml logs client
docker-compose -f docker-compose.prod.yml logs api
```

### Fermare i servizi

```bash
docker-compose -f docker-compose.prod.yml down
```

### Riavviare i servizi

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Aggiornare il codice

```bash
# Dopo aver fatto pull o modifiche
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Il client non si connette all'API

1. Verifica che `VITE_API_URL` nel file `.env` sia corretto
2. Controlla che l'API sia in esecuzione: `docker-compose -f docker-compose.prod.yml ps`
3. Verifica i log: `docker-compose -f docker-compose.prod.yml logs api`

### Non riesco ad accedere da internet

**Se usi Tailscale:**

1. Verifica che Tailscale sia attivo: `tailscale status`
2. Assicurati che il dispositivo client sia connesso alla stessa rete Tailscale
3. Verifica che il dominio Tailscale sia corretto nel file `.env`

**Se NON usi Tailscale:**

1. Verifica che il port forwarding sia configurato correttamente sul router
2. Controlla che il firewall del Raspberry Pi permetta le connessioni
3. Verifica che il tuo ISP non blocchi le porte (alcuni ISP bloccano la porta 80)

### Errori CORS

Se vedi errori CORS, assicurati che l'API sia configurata per accettare richieste dal dominio/IP del client.

## Sicurezza

⚠️ **IMPORTANTE**: Prima di esporre il servizio su internet:

1. Cambia le password di default nel file `.env`
2. Configura HTTPS con Let's Encrypt
3. Considera l'uso di un firewall applicativo (WAF)
4. Limita l'accesso alle porte del database (non esporre la porta 5457 pubblicamente)
5. Usa autenticazione forte per l'accesso SSH al Raspberry Pi
