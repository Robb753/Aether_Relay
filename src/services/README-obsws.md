# obsws.js

Connexion et contrôle d'OBS Studio via WebSocket.

## Ce qu'il fait

- Se connecte à OBS WebSocket (plugin natif depuis OBS 28+)
- Permet de switcher de scène à distance
- Permet de mettre à jour l'URL d'un Browser Source à distance
- Se reconnecte automatiquement si OBS redémarre

## Variables d'environnement

| Variable       | Défaut      | Description                        |
|----------------|-------------|------------------------------------|
| `OBS_HOST`     | `localhost` | IP du PC OBS (Lenovo sur le réseau)|
| `OBS_PORT`     | `4455`      | Port WebSocket OBS                 |
| `OBS_PASSWORD` | _(vide)_    | Mot de passe OBS WebSocket         |

## Configuration OBS requise

1. OBS → Outils → WebSocket Server Settings
2. Activer "Enable WebSocket server"
3. Port : 4455
4. Définir un mot de passe → le mettre dans `.env`

## Scènes OBS attendues

| Scène           | Usage                              |
|-----------------|------------------------------------|
| `Dashboard`     | Scène principale — Chrome dashboard|
| `Launch Mode`   | Browser Source → stream YouTube    |

## Browser Source attendu

Dans la scène "Launch Mode", créer un Browser Source nommé
exactement `LaunchStream`. C'est ce nom que le scheduler utilise
pour injecter l'URL YouTube automatiquement.

## Reconnexion automatique

Si OBS est éteint ou redémarre, obsws.js tente une reconnexion
toutes les 15 secondes. Le serveur continue de tourner sans OBS.