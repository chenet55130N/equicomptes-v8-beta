# ÉquiComptes V9.0 — rapport de contrôles prépublication

Date : 16 novembre 2026
Branche : `v9-candidate-prepublication`
Version officielle inchangée : V8.3 (`main`)
Lien des tests automatiques : https://github.com/chenet55130N/equicomptes-v8-beta/actions/runs/43872278617

## Résultats vérifiés

- **PASS** — Syntaxe des scripts embarqués dans `index.html` et du module `sync-v8.js`.
- **PASS** — Reconstitution d'un foyer V8.3 fictif (paramètres, modèles de revenus, mois/salaires, charges et échéanciers, revenus complémentaires et confirmations, dépenses, remboursements, historique) dans la structure du nouveau moteur V9.
- **PASS** — Initialisation par défaut en mode compte joint pour un foyer V8.3 sans métadonnées bancaires V9.
- **PASS** — Import/export : conservation du document bancaire `lab`, y compris les transitions datées. L'importeur d'anciens codes de personne n'interprète plus les champs `from/to` du bloc bancaire V9.
- **PASS** — Retour des sauvegardes automatiques et version correcte des exports V9.
- **PASS** — Affichage et calcul basés sur les archives enregistrées pour les périodes historiques V8.3 ; les anciennes charges ne sont plus remplacées par les charges actuelles pendant la consultation.
- **PASS** — Premier foyer : création Firestore `version: 8`, puis écriture du document bancaire V9 après validation de l'appartenance au foyer (conforme aux règles fournies par l'utilisateur).
- **PASS** — Conflit de concurrence simulé : une transaction bancaire écrit si le document n'a pas changé et déclenche la résolution manuelle si l'autre appareil l'a modifié ; sans écrasement silencieux.
- **PASS** — Passage simulé de novembre à décembre 2026 : nouveau mode activé après clôture et présence des confirmations ; mois précédent archivé.
- **PASS** — Passage bloqué si un virement antérieur n'est pas validé ; la date affichée reste la date civile réelle même si le changement bancaire est suspendu.
- **PASS** — Le workflow GitHub Actions « Vérifications ÉquiComptes V9 » a réussi sur la proposition n°1.

## Éléments appuyés sur les retours de test de l'utilisateur

- La création et les calculs sur un foyer fictif connecté ont été annoncés fonctionnels.
- La synchronisation entre deux appareils a été jugée fonctionnelle pour la suite à la demande explicite de l'utilisateur.
- La sauvegarde des données de la V8.3 officielle est déclarée faite.

Ces éléments sont des retours de l'utilisateur et **non** des tests directs sur son foyer réel.

## Risques résiduels et conditions de publication

1. **Coexistence d'anciens clients** : aucune règle serveur ne bloque encore un téléphone restant actif sur V8.3 pendant qu'un autre utilise V9. Les deux appareils doivent donc quitter l'application puis être relancés à partir de la version publiée, sans maintenir une ancienne session ouverte.
2. **Migration réelle du foyer** : les vérifications par données fictives n'impliquent aucun accès aux documents privés du foyer V8.3 ; le contrôle du foyer réel après déploiement reste indispensable (charges, revenus, remboursements, historique).
3. **Migration bancaire à date réelle** : les scénarios JavaScript sont satisfaisants, mais un changement de mode réel au premier jour d'un nouveau mois n'a pas été observé sur Firebase.
4. **Conflits hors ligne complexes** : la transaction bancaire est vérifiée avec un simulateur, pas avec une simultanéité réelle entre deux appareils.
5. **Taille de l'archive** : `settings/v9-banking` inclut les instantanés mensuels ; une croissance importante sur plusieurs années mérite une évolution vers des archives documentaires séparées.

## Recommandation de mise en service

Publication **possible après une coordination de bascule des appareils**, avec la sauvegarde V8.3 conservée. Si un contrôle critique ne concorde pas dans le foyer réel, revenir au code V8.3 conservé sur `sauvegarde-v8-3-avant-v9-20261116` ; ne pas supprimer les nouveaux documents V9 sans évaluer les données saisies depuis la bascule.

La présente analyse ne certifie pas l'absence de tous les défauts ; les vérifications réelles dépendent de Firebase et de l'utilisation des appareils.
