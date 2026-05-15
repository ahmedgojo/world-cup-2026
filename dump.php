<?php
require 'db_connect.php';
$stmt = $pdo->query("SELECT * FROM teams ORDER BY name ASC");
$teams = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach($teams as $t) {
    echo $t['name'] . " (" . $t['code'] . ")\n";
}