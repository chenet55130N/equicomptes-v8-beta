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
- [x] Contrôler la compatibilité théorique des règles Firestore fournies : l'accès à `settings/v9-banking` est autorisé pour les membres vérifiés du foyer. La règle de création du foyer impose `version == 8` ; le candidat crée désormais le document V9 après le lot créant foyer et membre.
- [ ] Vérifier ces permissions par un essai réel authentifié sur foyer fictif (pas encore réalisé).
- [ ] Vérifier le premier démarrage d'un foyer V8.3 et la récupération exacte de ses données, sans les modifier.
- [ ] Vérifier la création d'un nouveau foyer dans les deux modes.
- [ ] Vérifier l'ajout/mise à jour de `settings/v9-banking` avec deux appareils et les conflits hors ligne. **Hypothèse de travail donnée par l'utilisateur : fonctionnement inter-appareils OK ; pas de procès-verbal d'essai hors ligne ou de conflits à ce stade.**
- [ ] Tester la migration bancaire aux limites de mois et sa synchronisation sur les appareils.
- [ ] Vérifier la compatibilité ou bloquer les anciens clients V8.3 qui pourraient éditer des charges pendant une migration.
- [ ] Vérifier l'activation automatique de la date réelle sur les appareils et les mois non clôturés. **Code candidat corrigé** : contrôle après lecture du serveur et retour au premier plan ; scénario JavaScript du passage 2026-11 → 2026-12 réussi avec activation du nouveau mode et blocage en présence d'un virement non validé. Test réel encore à réaliser.
- [ ] Tester l'export, la restauration et la taille croissante des archives mensuelles.
- [ ] Tester les revenus complémentaires dans les deux modes, y compris la confirmation sur deux appareils.
- [ ] Faire valider l'expérience réelle Android par l'utilisateur, avec sauvegarde privée des données avant publication.

## Protection et retour arrière
- Sauvegarde complète du code de V8.3, branche `sauvegarde-v8-3-avant-v9-20261116`.
- Ne PAS importer de données privées dans GitHub.
- Avant publication, exporter les données du foyer, mettre à jour tous les appareils et prévoir rollback code + conservation des nouveaux champs V9.
- La création de cette proposition GitHub ne change pas le site officiel ni le service worker actif.

## Point de situation complémentaire (16 novembre 2026)
- Les tests sur deux appareils sont **considérés fonctionnels pour la planification à la demande de l'utilisateur**, sans certifier qu'un contrôle indépendant a été effectué.
- L'activation réelle au premier jour du mois était absente du candidat initial et a été ajoutée (nouvelle méthode `advanceRealDate`), avec contrôle de scénarios en JavaScript ; n'a pas encore été validée lors d'un véritable passage au mois suivant avec Firebase.
- L'interface connectée ne présente plus les messages trompeurs « démonstration sans Firebase ».
- Risque résiduel : un appareil exécutant encore une ancienne V8.3 en cache pourrait modifier les charges pendant la transition. Tous les appareils du foyer doivent être mis à jour ensemble, et une stratégie de blocage des anciens clients reste à concevoir avant généralisation.
