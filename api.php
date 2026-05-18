<?php
date_default_timezone_set('Africa/Casablanca');
require_once 'db_connect.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST') {
    if ($action === 'create') {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $name = $input['name'] ?? $_GET['name'] ?? ("Prédiction " . date("d M, H:i"));
            $stmt = $pdo->prepare("INSERT INTO user_state (user_id, prediction_name, state_json) VALUES (1, ?, 'null')");
            $stmt->execute([$name]);
            $id = $pdo->lastInsertId();
            echo json_encode(['status' => 'success', 'id' => $id, 'name' => $name]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } elseif ($action === 'delete') {
        $id = $_GET['id'] ?? null;
        if ($id) {
            try {
                $stmt = $pdo->prepare("DELETE FROM user_state WHERE id = ? AND user_id = 1");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success', 'message' => 'Prédiction supprimée']);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid Request']);
        }
    } else {
        // Save State
        $input = file_get_contents('php://input');
        $id = $_GET['id'] ?? null;

        if ($input && $id) {
            try {
                $data = json_decode($input, true);
                
                $pdo->beginTransaction();
                
                $stmt = $pdo->prepare("UPDATE user_state SET state_json = ? WHERE id = ? AND user_id = 1");
                $stmt->execute([$input, $id]);
                
                if (isset($data['finalStandings']) && is_array($data['finalStandings'])) {
                    // Clear previous results for this prediction session to prevent duplicates
                    $deleteStmt = $pdo->prepare("DELETE FROM prediction_results WHERE prediction_id = ?");
                    $deleteStmt->execute([$id]);
                    
                    // Insert achievements
                    $insertStmt = $pdo->prepare("INSERT INTO prediction_results (prediction_id, team_code, final_position) VALUES (?, ?, ?)");
                    foreach ($data['finalStandings'] as $resItem) {
                        $insertStmt->execute([$id, $resItem['team_code'], $resItem['final_position']]);
                    }
                }
                
                $pdo->commit();
                echo json_encode(['status' => 'success', 'message' => 'État sauvegardé']);
            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Requête invalide']);
        }
    }
} elseif ($method === 'GET') {
    if ($action === 'get_teams') {
        try {
            $stmt = $pdo->query("SELECT * FROM teams ORDER BY name ASC");
            echo json_encode($stmt->fetchAll());
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } elseif ($action === 'get_predictions') {
        try {
            $stmt = $pdo->prepare("SELECT id, prediction_name FROM user_state WHERE user_id = 1 ORDER BY updated_at DESC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll());
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } elseif ($action === 'get_history') {
        try {
            $sql = "SELECT 
                        us.id as prediction_id,
                        us.prediction_name,
                        MAX(CASE WHEN pr.final_position = 'Champion' THEN t.name END) as champion_name,
                        MAX(CASE WHEN pr.final_position = 'Champion' THEN t.code END) as champion_code,
                        MAX(CASE WHEN pr.final_position = 'Champion' THEN t.flag_code END) as champion_flag,
                        MAX(CASE WHEN pr.final_position = 'Runner-up' THEN t.name END) as runner_up_name,
                        MAX(CASE WHEN pr.final_position = 'Runner-up' THEN t.code END) as runner_up_code,
                        MAX(CASE WHEN pr.final_position = 'Runner-up' THEN t.flag_code END) as runner_up_flag
                    FROM user_state us
                    JOIN prediction_results pr ON us.id = pr.prediction_id
                    JOIN teams t ON pr.team_code = t.code
                    WHERE pr.final_position IN ('Champion', 'Runner-up')
                    GROUP BY us.id, us.prediction_name, us.updated_at
                    ORDER BY us.updated_at DESC";
            $stmt = $pdo->query($sql);
            echo json_encode($stmt->fetchAll());
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } elseif ($action === 'load_prediction') {
        $id = $_GET['id'] ?? null;
        if ($id) {
            try {
                $stmt = $pdo->prepare("SELECT state_json FROM user_state WHERE id = ? AND user_id = 1");
                $stmt->execute([$id]);
                $row = $stmt->fetch();
                echo $row ? $row['state_json'] : json_encode(null);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            }
        }
    } else {
        // Default: load latest
        try {
            $stmt = $pdo->prepare("SELECT id, state_json FROM user_state WHERE user_id = 1 ORDER BY updated_at DESC LIMIT 1");
            $stmt->execute();
            $row = $stmt->fetch();
            if ($row) {
                echo json_encode(['id' => $row['id'], 'state' => json_decode($row['state_json'])]);
            } else {
                echo json_encode(null);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}
?>
