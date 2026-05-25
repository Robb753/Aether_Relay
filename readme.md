# 🚀 AETHER RELAY — Post-it

## SERVEUR
- IP : `178.105.188.205`
- Dashboard : `http://178.105.188.205`
- Admin : `http://178.105.188.205/admin`

## AVANT CHAQUE LANCEMENT
1. Allumer le Lenovo + ouvrir OBS
2. Aller sur `/admin` → coller URL YouTube → SAVE
3. Cliquer "Commencer le streaming" dans OBS
4. Le switch Dashboard → Launch Mode est automatique à T−15 min

## MODIFIER LE PROJET
```
# Sur PC principal
npm start              → tester en local

git add .
git commit -m "..."
git push origin main   → sauvegarder

# Sur Hetzner
ssh root@178.105.188.205
cd /var/www/Aether_Relay
git pull origin main
pm2 restart aether-relay
```

## URLS YOUTUBE
Format à utiliser : `https://www.youtube.com/live/VIDEO_ID`
L'admin convertit automatiquement tous les formats.

## SI ÇA PLANTE
```
ssh root@178.105.188.205
pm2 logs aether-relay --lines 20   → voir les erreurs
pm2 restart aether-relay           → redémarrer
```

## COÛTS
- Hetzner CX23 : ~4.79€/mois