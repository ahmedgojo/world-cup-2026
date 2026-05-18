CREATE DATABASE IF NOT EXISTS worldcup2026;
USE worldcup2026;

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    flag_code VARCHAR(10) NOT NULL
);

-- User State Table
CREATE TABLE IF NOT EXISTS user_state (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT 1, -- Placeholder for multi-user support if needed
    prediction_name VARCHAR(100) NOT NULL DEFAULT 'Prediction 1',
    state_json LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed Teams
INSERT INTO teams (code, name, flag_code) VALUES
('mex', 'Mexico', 'mx'),
('kor', 'South Korea', 'kr'),
('cze', 'Czech Republic', 'cz'),
('rsa', 'South Africa', 'za'),
('can', 'Canada', 'ca'),
('sui', 'Switzerland', 'ch'),
('bih', 'Bosnia', 'ba'),
('qat', 'Qatar', 'qa'),
('bra', 'Brazil', 'br'),
('mor', 'Morocco', 'ma'),
('sco', 'Scotland', 'gb-sct'),
('hai', 'Haiti', 'ht'),
('usa', 'USA', 'us'),
('tur', 'Turkey', 'tr'),
('par', 'Paraguay', 'py'),
('aus', 'Australia', 'au'),
('ger', 'Germany', 'de'),
('ecu', 'Ecuador', 'ec'),
('civ', 'Ivory Coast', 'ci'),
('cuw', 'Curacao', 'cw'),
('ned', 'Netherlands', 'nl'),
('jpn', 'Japan', 'jp'),
('swe', 'Sweden', 'se'),
('tun', 'Tunisia', 'tn'),
('bel', 'Belgium', 'be'),
('egy', 'Egypt', 'eg'),
('irn', 'Iran', 'ir'),
('nzl', 'New Zealand', 'nz'),
('spa', 'Spain', 'es'),
('uru', 'Uruguay', 'uy'),
('ksa', 'Saudi Arabia', 'sa'),
('cpv', 'Cape Verde', 'cv'),
('fra', 'France', 'fr'),
('sen', 'Senegal', 'sn'),
('nor', 'Norway', 'no'),
('irq', 'Iraq', 'iq'),
('arg', 'Argentina', 'ar'),
('aut', 'Austria', 'at'),
('alg', 'Algeria', 'dz'),
('jor', 'Jordan', 'jo'),
('por', 'Portugal', 'pt'),
('col', 'Colombia', 'co'),
('uzb', 'Uzbekistan', 'uz'),
('cod', 'DR Congo', 'cd'),
('eng', 'England', 'gb-eng'),
('cro', 'Croatia', 'hr'),
('pan', 'Panama', 'pa'),
('gha', 'Ghana', 'gh');

-- Prediction Results Table
CREATE TABLE IF NOT EXISTS prediction_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prediction_id INT NOT NULL,
    team_code VARCHAR(10) NOT NULL,
    tournament_year INT DEFAULT 2026,
    final_position VARCHAR(50) NOT NULL,
    FOREIGN KEY (prediction_id) REFERENCES user_state(id) ON DELETE CASCADE,
    FOREIGN KEY (team_code) REFERENCES teams(code) ON DELETE CASCADE,
    UNIQUE KEY uq_prediction_team (prediction_id, team_code)
);
