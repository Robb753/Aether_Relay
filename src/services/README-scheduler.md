# scheduler.js

Surveillance des lancements imminents et orchestration automatique
du switch OBS Dashboard → Launch Mode.

## Ce qu'il fait

1. Vérifie toutes les 60 secondes les prochains lancements
2. Détecte quand un lancement entre dans la fenêtre T−15 min
3. Injecte l'URL YouTube dans le Browser Source OBS
4. Switch automatiquement vers la scène "Launch Mode"
5. Revient automatiquement à "Dashboard" à T+45 min

## Fenêtres de temps

| Constante        | Valeur | Description                          |
|------------------|--------|--------------------------------------|
| `ALERT_MINUTES`  | 15 min | Switch vers Launch Mode              |
| `RETURN_MINUTES` | 45 min | Retour Dashboard après le lancement  |
| `CHECK_INTERVAL` | 60 sec | Fréquence de vérification            |

## Flux complet
T−15 min → activateLaunchMode()
↓
updateBrowserSource('LaunchStream', url)  ← URL YouTube
↓
switchScene('Launch Mode')
↓
T+45 min → deactivateLaunchMode()
↓
switchScene('Dashboard')

## Gestion des URLs stream

Les URLs YouTube sont stockées en mémoire dans une Map :

```javascript
// Enregistrer une URL
scheduler.setStreamUrl('launch-id-123', 'https://youtube.com/watch?v=...');

// Récupérer une URL
scheduler.getStreamUrl('launch-id-123');
```

Elles sont renseignées via la page `/admin` du serveur.

## Sans URL enregistrée

Si aucune URL n'est renseignée pour un lancement, le scheduler
switche quand même vers "Launch Mode" mais sans vidéo.
Le Browser Source restera vide — pas de crash.

## Sans OBS connecté

Si OBS est éteint, les appels switchScene et updateBrowserSource
échouent silencieusement (warning dans les logs).
Le scheduler continue de tourner normalement.