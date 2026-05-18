<?php
require_once 'db_connect.php';

$stmt = $pdo->prepare("SELECT id, state_json FROM user_state WHERE user_id = 1 ORDER BY updated_at DESC LIMIT 1");
$stmt->execute();
$savedState = $stmt->fetch();
$hasSavedState = ($savedState && $savedState['state_json'] !== 'null');
$initialId = $savedState ? $savedState['id'] : 'null';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>World Cup 2026 Predictor</title>
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body>

<header class="app-header">
    <div class="container header-container">
        <div>
            <h1 class="heading-bold">World cup 2026</h1>
            <p>Prédictions Interactives du Tournoi</p>
        </div>
        <div class="scenario-controls" style="display: flex; gap: 10px; align-items: center;">
            <select id="scenario-switcher" class="scenario-switcher">
                <option value="">Chargement des scénarios...</option>
            </select>
            <button id="add-scenario-btn" class="btn btn-success" style="padding: 6px 10px; display: flex; align-items: center; justify-content: center; border-radius: 6px;" title="Ajouter une nouvelle prédiction (Invité)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button id="view-history-btn" class="btn btn-primary" style="padding: 6px 12px; display: flex; align-items: center; gap: 6px; border-radius: 6px; font-weight: 600; font-size: 0.85rem;" title="Voir l'Historique Global">
                🏆 Historique
            </button>
        </div>
    </div>
</header>

<main class="container">
    
    <!-- PHASE 0: GROUP ALLOCATION -->
    <section id="phase0" class="<?= $hasSavedState ? 'hidden' : '' ?>">
        <div class="section-header">
            <div>
                <h2 class="heading-bold section-title">PHASE 0 : TIRAGE DES GROUPES</h2>
                <p class="section-subtitle">Attribuez les 48 équipes aux groupes A à L. Chaque groupe doit comporter exactement 4 équipes.</p>
            </div>
            <button id="save-groups-btn" class="btn btn-primary" disabled>Enregistrer et passer aux prédictions</button>
        </div>

        <div class="pool-container">
            <h3 class="heading-bold pool-title">Équipes Disponibles (<span id="pool-count">48</span> restantes)</h3>
            <div id="team-pool" class="team-pool">
                <!-- Teams will be loaded here -->
            </div>
        </div>

        <div id="allocation-grid" class="grid-container allocation-grid">
            <!-- 12 Empty Group Containers -->
            <?php foreach (range('A', 'L') as $letter): ?>
                <div class="card allocation-group" data-group="<?= $letter ?>">
                    <div class="group-header heading-bold">Groupe <?= $letter ?></div>
                    <div class="allocation-slots" id="slots-<?= $letter ?>">
                        <div class="allocation-slot" data-index="0"></div>
                        <div class="allocation-slot" data-index="1"></div>
                        <div class="allocation-slot" data-index="2"></div>
                        <div class="allocation-slot" data-index="3"></div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </section>

    <!-- PREDICTION PHASES -->
    <div id="prediction-wrapper" class="<?= $hasSavedState ? '' : 'hidden' ?>">
        <section id="phase1">
            <div class="phase-header">
                <button id="config-teams-btn" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px; margin-bottom: 20px;">⚙️ Configurer les équipes</button>
                <button id="back-to-draw-btn" class="btn btn-secondary" style="display: none;">← Retour au tirage des groupes</button>
            </div>
            <h2 class="heading-bold section-title">PHASE DE GROUPES</h2>
            <p class="section-subtitle">Sélectionnez l'ordre de classement pour chaque groupe. Cliquez sur une équipe pour lui attribuer la prochaine position disponible.</p>
            <div id="groups-container" class="grid-container groups-grid">
                <!-- Groups will be rendered here by JS -->
            </div>
        </section>

        <section id="phase2" class="hidden">
            <h2 class="heading-bold section-title">MEILLEURS TROISIÈMES</h2>
            <p class="section-subtitle">Sélectionnez exactement 8 équipes troisièmes pour accéder à la phase à élimination directe.</p>
            <div class="third-place-header">
                <span id="third-place-counter" class="counter">0/8 sélectionnées</span>
            </div>
            <div id="thirds-container" class="grid-container thirds-grid">
                <!-- 3rd place teams rendered here -->
            </div>
        </section>

        <section id="phase3" class="hidden">
            <h2 class="heading-bold section-title">PHASE À ÉLIMINATION DIRECTE</h2>
            <p class="section-subtitle">Sélectionnez le vainqueur de chaque match pour le faire passer au tour suivant.</p>
            
            <div class="knockout-rounds" id="knockout-container">
                <!-- Rounds rendered here -->
            </div>
            
            <!-- Summary Table will be rendered here -->
            <div id="summary-container"></div>
            
            <div class="reset-container" style="text-align: center; margin-top: 60px;">
                <button id="start-new-btn" class="btn btn-danger">Nouvelle Prédiction (Réinitialiser)</button>
            </div>
        </section>
    </div>

</main>

<div id="toast-container" class="toast-container"></div>

<!-- GLOBAL HISTORY MODAL -->
<div id="history-modal" class="modal-overlay hidden">
    <div class="modal-card">
        <div class="modal-header">
            <h2 class="heading-bold modal-title">🏆 Historique Global</h2>
            <button id="close-history-btn" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
            <div id="history-table-container">
                <p class="loading-text">Chargement de l'historique...</p>
            </div>
        </div>
    </div>
</div>

<script>
    // Initialize state from PHP if available
    const INITIAL_LOAD_STATE = <?= $hasSavedState ? $savedState['state_json'] : 'null' ?>;
    let currentPredictionId = <?= $initialId ?>;
</script>
<script src="script.js"></script>

</body>
</html>