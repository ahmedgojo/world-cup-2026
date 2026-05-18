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
                $stmt = $pdo->prepare("UPDATE user_state SET state_json = ? WHERE id = ? AND user_id = 1");
                $stmt->execute([$input, $id]);
                echo json_encode(['status' => 'success', 'message' => 'État sauvegardé']);
            } catch (Exception $e) {
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
