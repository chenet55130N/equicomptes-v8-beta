# Prépublication ÉquiComptes V9.0 — candidat non déployé

État au 16 novembre 2026 : version V9.0 en cours d'intégration technique, **non autorisée à remplacer la V8.3** avant tests Firebase.

## Modifications intégrées sur la branche
- Moteur de charges et de compensation en mode compte joint ou deux comptes personnels, dérivé du LAB.
- Comptes payeurs par charge, datés par mois ; 50/50/prorata et historique datés.
- Mouvements confirmés et périodes clôturées protégés ; changement de mode programmé au mois suivant.
- Revenus complémentaires séparés du calcul principal de compensation.
- Choix du mode bancaire à la création d'un foyer.
- Adaptation de synchronisation Firebase dans `sync-v8.js` : document indépendant `foyers/{hid}/settings/v9-banking`.
- Cache PWA et manifeste V9.0.

## Validation déjà obtenue
- LAB : 1 400 tests aléatoires de calcul, 15 tests d'historique, 8 tests de modification de charge, 6 tests de remboursement et 3 tests de changement de mois réussis.
- Analyse syntaxique des 6 scripts HTML, du module Firebase (parsing asynchrone) et du service worker réussie.
- Aucune donnée de foyer réel n'a été utilisée pour les calculs.

## Conditions bloquantes AVANT fusion sur main
- [ ] Connecter et contrôler le projet Firebase/Firestore réel, règles d'accès du document `settings/v9-banking`.
- [ ] Vérifier le premier démarrage d'un foyer V8.3 et la récupération exacte de ses données, sans les modifier.
- [ ] Vérifier la création d'un nouveau foyer dans les deux modes.
- [ ] Vérifier l'ajout/mise à jour de `settings/v9-banking` avec deux appareils et les conflits hors ligne.
- [ ] Tester la migration bancaire aux limites de mois et sa synchronisation sur les appareils.
- [ ] Vérifier la compatibilité ou bloquer les anciens clients V8.3 qui pourraient éditer des charges pendant une migration.
- [ ] Vérifier l'activation automatique de la date réelle sur les appareils et les mois non clôturés.
- [ ] Tester l'export, la restauration et la taille croissante des archives mensuelles.
- [ ] Tester les revenus complémentaires dans les deux modes, y compris la confirmation sur deux appareils.
- [ ] Faire valider l'expérience réelle Android par l'utilisateur, avec sauvegarde privée des données avant publication.

## Protection et retour arrière
- Sauvegarde complète du code de V8.3, branche `sauvegarde-v8-3-avant-v9-20261116`.
- Ne PAS importer de données privées dans GitHub.
- Avant publication, exporter les données du foyer, mettre à jour tous les appareils et prévoir rollback code + conservation des nouveaux champs V9.
- La création de cette proposition GitHub ne change pas le site officiel ni le service worker actif.
