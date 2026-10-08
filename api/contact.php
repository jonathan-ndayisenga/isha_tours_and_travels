<?php
declare(strict_types=1);

function respondsWithHtml(): bool
{
    $accept = (string)($_SERVER['HTTP_ACCEPT'] ?? '');
    $contentType = (string)($_SERVER['CONTENT_TYPE'] ?? '');

    if (str_contains($contentType, 'application/json')) {
        return false;
    }

    return str_contains($accept, 'text/html') && !str_contains($accept, 'application/json');
}

function sendJson(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES) . "\n";
}

function redirect(string $url): void
{
    header('Location: ' . $url, true, 303);
}

function sanitizeHeaderValue(string $value): string
{
    return str_replace(["\r", "\n"], '', $value);
}

function limitLen(string $value, int $max): string
{
    if (mb_strlen($value, 'UTF-8') <= $max) {
        return $value;
    }
    return mb_substr($value, 0, $max, 'UTF-8');
}

function getClientIp(): string
{
    return (string)($_SERVER['REMOTE_ADDR'] ?? '');
}

function rateLimitOrNull(string $key, int $windowSeconds): ?int
{
    if ($key === '') {
        return null;
    }

    $file = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'isha_contact_' . sha1($key) . '.txt';
    $now = time();

    if (is_file($file)) {
        $last = (int)@file_get_contents($file);
        if ($last > 0 && ($now - $last) < $windowSeconds) {
            return $windowSeconds - ($now - $last);
        }
    }

    @file_put_contents($file, (string)$now);
    return null;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    if (respondsWithHtml()) {
        redirect('../contact.html?error=method');
        exit;
    }

    sendJson(405, ['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$retryAfter = rateLimitOrNull(getClientIp(), 30);
if ($retryAfter !== null) {
    if (respondsWithHtml()) {
        redirect('../contact.html?error=rate');
        exit;
    }

    header('Retry-After: ' . (string)$retryAfter);
    sendJson(429, ['ok' => false, 'error' => 'Too many requests. Please wait a moment and try again.']);
    exit;
}

$contentType = (string)($_SERVER['CONTENT_TYPE'] ?? '');
$data = [];

if (str_contains($contentType, 'application/json')) {
    $raw = (string)file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        sendJson(400, ['ok' => false, 'error' => 'Invalid JSON body']);
        exit;
    }
    $data = $decoded;
} else {
    $data = $_POST;
}

$name = trim((string)($data['name'] ?? ''));
$email = trim((string)($data['email'] ?? ''));
$phone = trim((string)($data['phone'] ?? ''));
$package = trim((string)($data['package'] ?? ''));
$travelDates = trim((string)($data['travel_dates'] ?? ''));
$message = trim((string)($data['message'] ?? ''));
$company = trim((string)($data['company'] ?? ''));
$page = trim((string)($data['page'] ?? ''));

// Honeypot: silently accept but don't send.
if ($company !== '') {
    if (respondsWithHtml()) {
        redirect('../contact.html?sent=1');
        exit;
    }

    sendJson(200, ['ok' => true]);
    exit;
}

$name = limitLen($name, 80);
$email = limitLen($email, 254);
$phone = limitLen($phone, 50);
$package = limitLen($package, 120);
$travelDates = limitLen($travelDates, 120);
$message = limitLen($message, 4000);
$page = limitLen($page, 500);

if ($name === '' || $email === '' || $message === '') {
    if (respondsWithHtml()) {
        redirect('../contact.html?error=missing');
        exit;
    }
    sendJson(400, ['ok' => false, 'error' => 'Name, Email, and Message are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    if (respondsWithHtml()) {
        redirect('../contact.html?error=email');
        exit;
    }
    sendJson(400, ['ok' => false, 'error' => 'Please enter a valid email address.']);
    exit;
}

$safeName = sanitizeHeaderValue($name);
$safeEmail = sanitizeHeaderValue($email);

$toEmail = 'ishatoursandtravels256@gmail.com';
$toName = 'Isha Tours and Travels';

$host = (string)($_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? ''));
$host = preg_replace('/:\d+$/', '', $host);
$fromEmail = 'no-reply@' . ($host !== '' ? $host : 'example.com');
$fromEmail = sanitizeHeaderValue($fromEmail);
if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    $fromEmail = 'no-reply@example.com';
}

$subjectParts = ['New inquiry'];
if ($package !== '') {
    $subjectParts[] = $package;
}
$subject = implode(' - ', $subjectParts);

$ip = getClientIp();
$ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
$sentAt = gmdate('Y-m-d H:i:s') . ' UTC';

$lines = [
    'New inquiry from Isha Tours and Travels website.',
    '',
    'Name: ' . $name,
    'Email: ' . $email,
    'Phone/WhatsApp: ' . ($phone !== '' ? $phone : '-'),
    'Preferred package: ' . ($package !== '' ? $package : '-'),
    'Travel dates: ' . ($travelDates !== '' ? $travelDates : '-'),
    'Page: ' . ($page !== '' ? $page : '-'),
    '',
    'Message:',
    $message,
    '',
    '---',
    'Sent at: ' . $sentAt,
    'IP: ' . ($ip !== '' ? $ip : '-'),
    'User agent: ' . ($ua !== '' ? $ua : '-'),
];

$body = implode("\n", $lines);

$fromName = mb_encode_mimeheader($toName, 'UTF-8');
$headers = [
    'From: ' . $fromName . ' <' . $fromEmail . '>',
    'Reply-To: ' . $safeName . ' <' . $safeEmail . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$ok = @mail($toEmail, $subject, $body, implode("\r\n", $headers));

if (!$ok) {
    if (respondsWithHtml()) {
        redirect('../contact.html?error=send');
        exit;
    }
    sendJson(500, ['ok' => false, 'error' => 'Failed to send message. Please try WhatsApp instead.']);
    exit;
}

if (respondsWithHtml()) {
    redirect('../contact.html?sent=1');
    exit;
}

sendJson(200, ['ok' => true]);
