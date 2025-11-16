# Security and Compliance Requirements

## 1. Authentication Security

### 1.1 JWT-Based Authentication System

WHEN a user submits valid login credentials via the authentication endpoint, THE system SHALL issue a JSON Web Token (JWT) that serves as proof of successful authentication and SHALL be used for all subsequent API requests.

THE system SHALL implement JWT authentication with the following technical specifications:

**JWT Structure Requirements:**
- THE JWT token SHALL be composed of three parts separated by periods: Header.Payload.Signature
- THE header portion SHALL specify the cryptographic algorithm (HS256 with HMAC-SHA256 or RS256 with RSA) and token type designation ("JWT")
- THE payload portion SHALL contain encoded claims about the user's identity and permissions
- THE signature portion SHALL be cryptographically signed using either a shared secret key (for HS256) or a private key (for RS256)

**JWT Access Token Payload Structure:**

THE access token payload SHALL contain the following required claims:

```json
{
  "sub": "user-identification",
  "userId": "unique-user-id-12345",
  "email": "user@example.com",
  "role": "user",
  "permissions": ["create_todo", "read_own_todo", "update_own_todo", "delete_own_todo", "mark_complete"],
  "iat": 1234567890,
  "exp": 1234568490,
  "iss": "todoApp",
  "aud": "todoApp-api"
}
```

- THE `sub` (subject) claim SHALL identify what the token represents ("user-identification")
- THE `userId` claim SHALL contain the unique identifier of the authenticated user
- THE `email` claim SHALL contain the user's email address for display and recovery purposes
- THE `role` claim SHALL specify the user's actor type: "user" or "admin"
- THE `permissions` array SHALL list specific permissions granted to this user based on their role
- THE `iat` (issued at) claim SHALL contain the Unix timestamp when the token was issued
- THE `exp` (expiration) claim SHALL contain the Unix timestamp when the token expires
- THE `iss` (issuer) claim SHALL identify the system that issued the token ("todoApp")
- THE `aud` (audience) claim SHALL specify which system(s) should accept this token ("todoApp-api")

**Access Token Expiration:**
- THE access token SHALL expire 15 minutes after issuance
- WHEN the access token expiration time is reached, THE system SHALL reject API requests using that token with HTTP 401 Unauthorized
- THE client application SHALL use the refresh token to obtain a new access token when the current token approaches expiration

**Refresh Token Payload Structure:**

THE refresh token payload SHALL contain the following required claims:

```json
{
  "sub": "refresh-token",
  "userId": "unique-user-id-12345",
  "tokenType": "refresh",
  "iat": 1234567890,
  "exp": 1234654290,
  "iss": "todoApp"
}
```

- THE refresh token SHALL be designed specifically for the purpose of obtaining new access tokens
- THE `tokenType` claim SHALL explicitly indicate this is a "refresh" token
- THE refresh token SHALL expire 7 days after issuance
- THE refresh token SHALL NOT contain user permissions or role information (these are only in access tokens)

**Token Issuance Process:**

WHEN a user successfully authenticates with valid email and password, THE system SHALL:
1. Verify the credentials against the stored password hash
2. Generate a new access token with 15-minute expiration
3. Generate a new refresh token with 7-day expiration
4. Return both tokens to the client in the authentication response with HTTP 200 OK
5. Store a server-side session record linking the tokens to the user
6. Return token type as "Bearer" for inclusion in Authorization headers

**Token Transmission and Storage:**

- THE access token SHALL be transmitted to the client in the HTTP response body as `accessToken`
- THE refresh token SHALL be transmitted to the client in the HTTP response body as `refreshToken`
- THE client application SHALL store the access token in secure browser storage (preferably httpOnly cookie or secure localStorage)
- THE client application SHALL store the refresh token separately with additional security (httpOnly cookie with Secure and SameSite flags)
- THE client application SHALL include the access token with each API request in the HTTP Authorization header using Bearer scheme: `Authorization: Bearer <accessToken>`
- THE refresh token SHALL NOT be transmitted with API requests; it SHALL only be used when obtaining a new access token

**Token Validation on API Requests:**

WHEN a client submits an API request with an Authorization header containing a JWT token, THE system SHALL:
1. Extract the token from the Authorization header (removing "Bearer " prefix)
2. Verify the token signature using the configured secret key or public key
3. Verify the token has not expired by checking the exp claim against current time
4. Verify the token issuer matches expected value ("todoApp")
5. Extract user information from the payload (userId, role, permissions)
6. Process the request if all validations pass
7. Return HTTP 401 Unauthorized if any validation fails

### 1.2 Token Refresh Mechanism

WHEN a client's access token is about to expire or has expired, THE system SHALL provide a mechanism for the client to obtain a new access token without requiring the user to log in again.

**Refresh Token Flow:**

WHEN a client receives HTTP 401 Unauthorized due to token expiration, THE client SHALL:
1. Identify that the token is expired (check exp claim or receive 401 response)
2. Send a refresh request to the token refresh endpoint with the refresh token
3. Include the refresh token in the request body: `{ "refreshToken": "<refreshTokenValue>" }`

WHEN the system receives a token refresh request, THE system SHALL:
1. Extract and validate the refresh token signature and expiration
2. Verify the token type is "refresh" (not an access token or other type)
3. Verify the refresh token has not expired
4. Look up the associated user account and verify it is still active
5. IF all validations pass, generate and return a new access token with fresh 15-minute expiration
6. Return the new access token to the client with HTTP 200 OK
7. THE client automatically retries the original request with the new access token

**Refresh Token Invalidation:**

- THE system SHALL track which refresh tokens are valid and in-use
- WHEN a user logs out, THE system SHALL invalidate all refresh tokens for that user
- WHEN a user's password is changed, THE system SHALL invalidate all refresh tokens to force re-authentication
- WHEN a refresh token is used to generate a new access token, THE system MAY invalidate the used refresh token (rotating tokens strategy)
- IF a refresh token is used more times than expected in a short period, THE system SHALL consider this suspicious and invalidate all tokens for that user

**Expired Refresh Token Handling:**

IF a client attempts to use an expired refresh token, THE system SHALL:
1. Reject the refresh request with HTTP 401 Unauthorized
2. Return error message: "Refresh token has expired. Please log in again."
3. The client SHALL redirect the user to the login page for new authentication

### 1.3 Multi-Factor Authentication Readiness

WHILE the minimum viable version does not require multi-factor authentication, THE system architecture SHALL be designed to support optional email-based verification.

WHERE email-based verification is configured, THE system SHALL:
- Send a verification code to the user's email during registration
- Require the user to enter the verification code to complete registration
- Store verification status in the user account
- Optionally require verification during password reset

### 1.4 Secure Session Management

WHEN a user logs in successfully, THE system SHALL create a server-side session record containing:
- Unique session ID
- User ID
- Session creation timestamp (UTC)
- Session expiration time (creation time + 30 days)
- Last activity timestamp
- User agent/browser information
- IP address of the login request

**Session Storage:**

THE session records SHALL be stored in a secure session storage mechanism (in-memory cache with database backup recommended).

**Session Timeout:**

IF a session remains inactive for more than 30 days, THE system SHALL automatically expire the session.

WHEN a session expires, THE system SHALL:
1. Invalidate the associated access and refresh tokens
2. Remove the session record
3. Require the user to log in again on next API request

**Concurrent Session Management:**

THE system SHALL allow multiple simultaneous sessions for the same user (same user logged in from multiple devices/browsers).

WHEN a user logs in from a new device, THE system SHALL create a new session record without invalidating existing sessions on other devices.

WHERE security policies require single-session enforcement, THE system SHALL invalidate all previous sessions for that user when a new login occurs.

### 1.5 Session Invalidation

WHEN a user logs out, THE system SHALL:
1. Invalidate the current session immediately
2. Revoke the access token associated with that session
3. Mark the refresh token as invalid/revoked
4. Remove the session record from active sessions
5. Return HTTP 200 OK with confirmation message

WHEN a user's password is changed, THE system SHALL:
1. Invalidate all active sessions for that user
2. Revoke all access and refresh tokens
3. Require the user to log in again with the new password
4. Log this action in the audit trail

WHEN suspicious activity is detected on an account, THE system MAY:
1. Forcibly terminate all active sessions
2. Lock the account temporarily
3. Require password reset and re-authentication
4. Notify the user of the suspicious activity

---

## 2. Password Security Requirements

### 2.1 Password Strength Standards

WHEN a user creates or updates their password, THE system SHALL enforce the following mandatory password requirements:

**Password Length Requirements:**
- THE password SHALL be a minimum of 8 characters in length
- THE password SHALL NOT exceed 128 characters in length

**Password Complexity Requirements:**
- THE password SHALL contain at least one uppercase letter from the set: A-Z
- THE password SHALL contain at least one lowercase letter from the set: a-z
- THE password SHALL contain at least one numeric digit from the set: 0-9
- THE password SHALL contain at least one special character from the set: !@#$%^&*-_=+

**Password Validation Rules:**
- THE password SHALL NOT contain the user's email address (case-insensitive comparison)
- THE password SHALL NOT be a commonly used password (check against list of top 10,000 commonly used passwords)
- THE password SHALL NOT be identical to the previous password (if user is changing existing password)

**Validation Error Messages:**

IF a password does not meet requirements, THE system SHALL reject the password and provide specific feedback about which requirements were violated:

- IF password is less than 8 characters: "Password must be at least 8 characters long."
- IF password is more than 128 characters: "Password is too long. Maximum 128 characters allowed."
- IF password lacks uppercase letter: "Password must contain at least one uppercase letter (A-Z)."
- IF password lacks lowercase letter: "Password must contain at least one lowercase letter (a-z)."
- IF password lacks numeric digit: "Password must contain at least one numeric digit (0-9)."
- IF password lacks special character: "Password must contain at least one special character (!@#$%^&*-_=+)."
- IF password contains email address: "Password cannot contain your email address."
- IF password is commonly used: "This password is too common. Please choose a more unique password."
- IF password is identical to previous: "You cannot reuse your previous password. Choose a different one."

### 2.2 Password Storage and Hashing

**Secure Password Storage Requirement:**

THE system SHALL NEVER store user passwords in plain text under any circumstances. THIS is a critical security requirement with zero exceptions.

**Approved Hashing Algorithms:**

THE system SHALL hash all passwords using one of the following cryptographically secure algorithms:
1. **bcrypt** - with minimum cost factor of 12 (rounds = 2^12 = 4,096 iterations)
2. **scrypt** - with parameters: N=2^14, r=8, p=1
3. **Argon2** - with parameters: time cost=2, memory cost=65536 KB, parallelism=1

**Hashing Process:**

WHEN storing a password, THE system SHALL:
1. Generate a cryptographic salt with minimum 16 bytes of entropy
2. Hash the password using the selected algorithm combined with the salt
3. Store the complete hash output including algorithm identifier and salt metadata
4. Store the result as provided by the hashing function (which includes salt and algorithm info)

**Example bcrypt hash storage format:**
```
$2b$12$R9h7cIPz0gi.URNN3kh2OPST9EgLNJBvZk5U/.GhU6GQJhXO2/4Zi
```

This format encodes the algorithm ($2b), cost factor (12), salt, and hash all in one string.

**Password Verification:**

WHEN a user logs in, THE system SHALL:
1. Retrieve the stored password hash from the database
2. Hash the submitted password using the same algorithm and salt from the stored hash
3. Compare the hashes using a constant-time comparison function
4. Grant access only if hashes match exactly

**No Password Logging:**

THE system SHALL NEVER log passwords or password hashes in any log file or error message.

THE system SHALL NOT include passwords in error responses sent to clients.

THE system SHALL NOT display passwords in any user interface or admin panel.

### 2.3 Password Reset Process

**Password Reset Request Initiation:**

WHEN a user requests a password reset, THE system SHALL:
1. Request only the user's email address (do not ask for current password)
2. Verify the email address exists in the system
3. Generate a unique password reset token with high entropy (minimum 256 bits)
4. Associate the reset token with the user account
5. Set an expiration time of 1 hour for the reset token
6. Send a password reset email containing a secure link with the reset token
7. Do NOT reveal whether the email address exists or doesn't exist (for security)

**Password Reset Email Requirements:**

THE password reset email SHALL:
- Be sent to the email address on file for the account
- Contain a unique reset link with the one-time reset token
- Include a clear message explaining what to do
- Expire after 1 hour or one use
- NOT contain the user's password or any sensitive information
- Use secure HTTPS link in the reset URL

**Password Reset Form Validation:**

WHEN a user clicks the password reset link and accesses the reset form, THE system SHALL:
1. Verify the reset token is valid and has not expired
2. Display the password reset form requesting new password
3. Validate the new password against all password strength requirements
4. Require the user to enter the new password twice for confirmation
5. Verify both password entries match

**Password Reset Execution:**

WHEN the user submits the password reset form, THE system SHALL:
1. Validate the reset token is still valid (not expired, not already used)
2. Verify the new password meets all strength requirements
3. Verify both password entries match exactly
4. Hash the new password using the configured algorithm
5. Update the user's stored password hash
6. Invalidate the reset token immediately (mark as used)
7. Invalidate all other outstanding reset tokens for that user
8. Invalidate all existing sessions and refresh tokens for that user
9. Send a confirmation email to the user notifying them their password was changed
10. Return a success message and redirect to login page

**Reset Token Security:**

- EACH reset token SHALL be unique and generated with high entropy
- EACH reset token SHALL be single-use (cannot be used twice)
- EACH reset token SHALL expire after 1 hour of issuance
- IF a reset token is used, THE system SHALL immediately invalidate it
- IF a reset token expires, THE system SHALL require the user to request a new reset link
- THE system SHALL limit password reset requests to a reasonable rate (e.g., 5 resets per 24 hours per email)

**Reset Token Limits:**

WHEN a user requests multiple password resets, THE system SHALL:
1. Allow reasonable number of reset requests (5 per 24 hours maximum)
2. Track reset request timestamps per email address
3. IF rate limit is exceeded, inform user: "You have requested password resets too many times. Please try again tomorrow."
4. The user can still recover via other means (contacting support)

### 2.4 Password History and Expiration

**Password History:**

THE system SHALL NOT require users to change their passwords on a scheduled basis (password expiration), as this encourages weak password practices and does not improve security.

THE system MAY optionally prevent reuse of the most recent previous password (optional 1-2 password history) to prevent users from cycling between a small set of passwords.

**No Mandatory Password Expiration:**

THE system SHALL NOT force password expiration on users.

IF a user's password appears to be compromised (due to breach notification or detected suspicious activity), THE system MAY force a password change, but this should be the exception rather than the rule.

---

## 3. Data Privacy and Protection

### 3.1 Data Encryption in Transit (HTTPS/TLS)

**Mandatory HTTPS Requirement:**

ALL communication between the client application and the backend server SHALL be encrypted using HTTPS (HTTP over TLS).

THE system SHALL NOT accept any unencrypted HTTP connections.

**TLS Version Requirements:**

- THE system SHALL use TLS version 1.2 or higher
- THE system SHALL disable support for TLS versions earlier than 1.2 (SSL 3.0, TLS 1.0, TLS 1.1)
- THE system SHALL prefer TLS version 1.3 where available for improved performance and security

**Certificate Requirements:**

- THE system SHALL use TLS certificates signed by a trusted Certificate Authority (CA)
- THE system SHALL use valid certificates with current expiration dates (not self-signed in production)
- THE system SHALL renew certificates before expiration
- THE system SHALL support HTTP/2 over HTTPS for improved performance

**HTTPS Enforcement:**

WHEN a client attempts to connect via unencrypted HTTP, THE system SHALL:
1. Refuse the connection immediately
2. Optionally redirect to HTTPS equivalent (HTTP status 301 or 307)
3. NOT transmit any data over unencrypted HTTP

**Certificate Pinning (Optional):**

WHERE maximum security is required, THE system MAY implement certificate pinning to prevent man-in-the-middle attacks by hardcoding the certificate or certificate chain in the application.

### 3.2 Data Encryption at Rest

**Sensitive Data Encryption:**

THE system SHALL encrypt sensitive user data stored in the database using strong encryption.

**Data Requiring Encryption at Rest:**
- User email addresses
- Hashed passwords (already protected via hashing, but may add encryption)
- Session tokens
- Any personal user information

**Encryption Algorithm Requirements:**

THE system SHALL use AES (Advanced Encryption Standard) encryption with:
- AES-256 (256-bit key length minimum)
- CBC (Cipher Block Chaining) or GCM (Galois/Counter Mode) as block cipher mode
- PKCS#7 padding for CBC mode

**Key Management:**

- THE encryption keys SHALL be stored separately from encrypted data
- THE encryption keys SHALL be protected with additional access controls
- THE encryption keys SHALL be rotated periodically (at least annually)
- THE encryption keys SHALL NOT be hardcoded in application source code
- THE encryption keys SHALL be stored in a secure key management system or vault

**Database-Level Encryption:**

THE underlying database file storage MAY be encrypted using database encryption features:
- PostgreSQL: pgcrypto extension or transparent data encryption
- MySQL: Transparent Data Encryption (TDE)
- MongoDB: Encrypted storage engine

### 3.3 User Data Isolation and Privacy

**Complete Data Isolation:**

THE system SHALL ensure complete isolation of user data such that:
- WHEN a user (with "user" role) requests their todo items, THE system SHALL return ONLY todos belonging to that user
- IF a user attempts to access another user's todo items through any means, THE system SHALL deny the request with HTTP 403 Forbidden
- THE system SHALL NOT allow users to access other users' account information, email addresses, or any personal data

**Enforcement at Multiple Layers:**

- THE application layer SHALL enforce data access controls on every request
- THE database queries SHALL filter by user ID to ensure only user's data is retrieved
- THE API endpoints SHALL verify user ownership before returning any data
- THE system SHALL implement defensive checks at each layer (not relying on single point of enforcement)

**Email Address Privacy:**

- THE system SHALL NOT expose user email addresses to other users
- IF admin features display user emails, THIS SHALL be restricted to admin-only views
- THE system SHALL NOT include email addresses in API responses unless specifically requested by that user

**Personal Data Minimization:**

THE system SHALL collect and store only the personal data necessary for core functionality:
- Email address (required for authentication and recovery)
- Password hash (required for authentication)
- Created date (required for auditing)
- Last active date (useful for analytics)
- The system SHALL NOT collect data like phone number, address, or other information not required for todo management

### 3.4 Data Retention and Deletion

**User Account Data Retention:**

WHILE a user account is active, THE system SHALL retain all user account data indefinitely:
- Email address and authentication information
- Account creation timestamp
- All todo items associated with the account
- Session history and audit logs

**Deleted Account Data Retention:**

WHERE a user requests account deletion (future feature), THE system SHALL:
1. Perform a soft delete: mark the user account as deleted but retain data in database
2. Delete all todo items associated with the user
3. Anonymize personally identifiable information (email address, etc.)
4. Retain anonymized audit logs for compliance purposes
5. Permanently delete the account after 30 days, making deletion reversible for user recovery
6. After 30 days, perform permanent deletion of all associated data

**Deleted Todo Item Retention:**

WHEN a user deletes a todo item, THE system SHALL permanently and immediately remove the todo from the database.

THE system SHALL NOT retain deleted todos in an archive or recovery area (unless such feature is explicitly added later).

**Data Retention for Compliance:**

THE system SHALL retain audit logs and transaction records for minimum 90 days for compliance and security investigation purposes.

AFTER 90 days, audit logs MAY be archived or deleted per data retention policies.

### 3.5 Sensitive Information Handling

**Information That Must NEVER Be Logged:**

- User passwords or password fragments
- Password reset tokens
- Authentication tokens (JWT, access tokens, refresh tokens)
- User session IDs
- Private encryption keys
- Authentication credentials in plain text

**Information That Must NOT Be Logged in Plain Text:**

- Email addresses (log user ID instead, or hash email if needed for correlation)
- Personal user information (unless anonymized)
- Full request bodies containing user data (log summary instead)

**Error Message Privacy:**

WHEN an error occurs, THE system SHALL:
- Display user-friendly error messages that do NOT expose system internals
- NOT include stack traces, database errors, or technical details in responses to clients
- Log technical details server-side for developers but never return them to clients
- Ensure error messages do NOT reveal whether an email exists or doesn't exist (for authentication errors)

**Example Authentication Error Privacy:**
- ❌ WRONG: "Email user@example.com does not exist in our database"
- ✅ CORRECT: "Invalid email or password. Please try again."

**Audit Log Sanitization:**

WHEN recording sensitive events in audit logs, THE system SHALL:
- Log that an authentication failure occurred without logging the attempted credentials
- Log that a password change occurred without logging the passwords
- Log resource access without logging the full resource content (log ID, not data)
- Replace sensitive values with identifiers for correlation purposes

---

## 4. API Security

### 4.1 CORS (Cross-Origin Resource Sharing) Policy

**Strict CORS Implementation:**

THE system SHALL implement a strict CORS policy that explicitly whitelists allowed origins (domains) rather than using wildcard rules.

**CORS Configuration:**

THE system SHALL specify exactly which frontend domain(s) are allowed to access the API:

```
Allowed Origins: https://todoapp.com, https://www.todoapp.com
Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
Allowed Headers: Authorization, Content-Type, Accept
Allowed Credentials: true (if using cookies for authentication)
Max Age: 3600 (cache preflight for 1 hour)
```

**CORS Response Headers:**

WHEN a browser makes a CORS request, THE system SHALL return appropriate headers:

```
Access-Control-Allow-Origin: https://todoapp.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
```

**Wildcard Prevention:**

THE system SHALL NEVER use wildcard (`*`) in the `Access-Control-Allow-Origin` header in production environments, as this would allow any website to access the API.

**Preflight Requests:**

THE system SHALL properly handle CORS preflight requests (OPTIONS method) by:
1. Responding to OPTIONS requests with appropriate CORS headers
2. Returning HTTP 200 OK for valid preflight requests
3. Rejecting preflight requests from disallowed origins with HTTP 403 Forbidden

### 4.2 Request Validation and Input Sanitization

**Multi-Layer Validation Strategy:**

WHEN the system receives an API request, THE system SHALL validate input at multiple layers:

**Layer 1: Request Structure Validation:**
- THE system SHALL verify the HTTP method is appropriate for the endpoint
- THE system SHALL verify required headers are present (Content-Type for POST/PUT, Authorization for protected endpoints)
- THE system SHALL verify the request body is valid JSON (if applicable)
- IF JSON is malformed, THE system SHALL return HTTP 400 Bad Request with error: "Invalid JSON format"

**Layer 2: Parameter Type Validation:**
- THE system SHALL verify each parameter has the correct data type (string, number, boolean, array, object)
- IF parameter type is wrong, THE system SHALL return HTTP 400 Bad Request with error: "Parameter 'X' must be a [expected type]"

**Layer 3: Parameter Value Validation:**
- THE system SHALL verify each parameter value is within acceptable ranges
- THE system SHALL verify string lengths (minimum and maximum)
- THE system SHALL verify numeric values are positive/within bounds as applicable
- THE system SHALL verify required fields are present
- THE system SHALL verify optional fields are valid if provided
- IF value is out of range, THE system SHALL return HTTP 400 Bad Request with specific guidance

**Layer 4: Input Sanitization:**

WHEN processing user input strings, THE system SHALL:
1. Remove leading and trailing whitespace (trim)
2. Escape or remove special characters that could be interpreted as code
3. Remove or reject any HTML/JavaScript content
4. Check for and reject SQL injection patterns
5. Validate against expected format (email format, URL format, etc. as applicable)

**Layer 5: Business Logic Validation:**
- THE system SHALL validate input against business rules (e.g., title length within limits)
- THE system SHALL validate data consistency (e.g., passwords match, dates are valid)
- IF business validation fails, THE system SHALL return HTTP 400 Bad Request with business-specific error message

**Example Validation Flow for Create Todo:**

```
1. Verify request method is POST
2. Verify Content-Type header is application/json
3. Verify request body contains valid JSON
4. Verify 'title' parameter is present and is a string
5. Verify 'title' string length is 1-255 characters
6. Verify 'description' (if provided) is a string ≤ 2000 characters
7. Trim whitespace from title and description
8. Escape any HTML/special characters
9. Verify title is not empty after trimming
10. Verify against business rules (no duplicate titles in same list, etc.)
11. Process valid request
```

### 4.3 API Rate Limiting

**Rate Limiting Requirements:**

THE system SHALL implement rate limiting to prevent abuse, denial-of-service attacks, and excessive resource consumption.

**Standard API Rate Limits:**

WHEN an authenticated user makes API requests, THE system SHALL allow:
- **Standard operations** (create, read, update, delete todos): Maximum 100 requests per minute per user
- **List retrieval**: Maximum 50 list requests per minute per user
- **Search operations**: Maximum 20 search requests per minute per user

**Tracking Rate Limits:**

THE system SHALL track request counts by:
- User ID (extracted from JWT token for authenticated requests)
- IP address (for unauthenticated requests)
- Time windows of 60 seconds (rolling or fixed windows)

**Rate Limit Responses:**

WHEN a user exceeds their rate limit, THE system SHALL:
1. Return HTTP 429 Too Many Requests
2. Include `Retry-After` header specifying seconds to wait before retrying
3. Include information about the rate limit in response body
4. Stop processing additional requests until the time window resets

**Example 429 Response:**
```json
{
  "status": 429,
  "error": "Too Many Requests",
  "message": "You have exceeded the rate limit of 100 requests per minute. Please try again in 45 seconds.",
  "retryAfter": 45,
  "currentRequests": 105,
  "limitPerMinute": 100
}
```

**Authentication Endpoint Rate Limiting (Stricter):**

AUTHENTICATION-RELATED endpoints SHALL have stricter rate limiting to prevent brute-force attacks:

- **Login endpoint**: Maximum 5 requests per 15 minutes per IP address
- **Registration endpoint**: Maximum 10 requests per hour per IP address
- **Password reset endpoint**: Maximum 5 requests per 24 hours per email address

**Rate Limit Status Headers:**

WHEN responding to requests, THE system SHALL include rate limit status headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 78
X-RateLimit-Reset: 1234567945
```

**Bypass Mechanisms:**

WHERE appropriate (e.g., for server-to-server calls or privileged operations), THE system MAY allow specific endpoints or API keys to bypass rate limiting through a whitelist mechanism.

### 4.4 SQL Injection Prevention

**Parameterized Queries Requirement:**

THE system SHALL use parameterized queries or prepared statements for ALL database operations.

THE system SHALL NEVER concatenate user input directly into SQL query strings.

**Implementation Strategy:**

THE development team SHOULD use an ORM (Object-Relational Mapping) framework such as:
- Prisma (recommended for this application)
- TypeORM
- Sequelize
- SQLAlchemy (for Python)

These frameworks automatically use parameterized queries by default.

**Example of WRONG Approach (Vulnerable to SQL Injection):**
```javascript
// ❌ NEVER do this
const query = `SELECT * FROM todos WHERE id = ${todoId} AND user_id = ${userId}`;
db.query(query); // VULNERABLE
```

**Example of CORRECT Approach (Protected):**
```javascript
// ✅ CORRECT - using parameterized queries
const result = await prisma.todo.findUnique({
  where: { id: todoId },
  // Filter applied by ORM ensures data isolation
});
```

**Input Validation as Defense in Depth:**

WHILE parameterized queries are the primary defense, THE system SHALL also:
- Validate that IDs are numeric/valid format before querying
- Validate string inputs against expected patterns
- Apply principle of least privilege (database user has only necessary permissions)

### 4.5 API Endpoint Protection

**Authentication on Protected Endpoints:**

WHEN a client makes a request to a protected API endpoint, THE system SHALL:

**Step 1: Extract the JWT Token**
- THE system SHALL look for the Authorization header in the request
- THE system SHALL extract the token value after the "Bearer " prefix
- IF no Authorization header is present, THEN THE system SHALL return HTTP 401 Unauthorized with error: "Authorization header missing"
- IF the Authorization header format is incorrect, THEN THE system SHALL return HTTP 401 Unauthorized with error: "Invalid authorization header format"

**Step 2: Validate the JWT Signature**
- THE system SHALL verify the JWT token signature using the configured secret key or public key
- IF the signature is invalid, THEN THE system SHALL return HTTP 401 Unauthorized with error: "Invalid token"
- IF the signature verification fails, THE system SHALL log this as a potential security incident

**Step 3: Check Token Expiration**
- THE system SHALL check the `exp` (expiration) claim against the current time
- IF the token has expired, THEN THE system SHALL return HTTP 401 Unauthorized with error: "Token has expired"
- THE system SHALL NOT accept requests with expired tokens

**Step 4: Verify Token Issuer**
- THE system SHALL verify the `iss` (issuer) claim matches the expected value ("todoApp")
- IF the issuer does not match, THEN THE system SHALL return HTTP 401 Unauthorized with error: "Invalid token issuer"

**Step 5: Extract and Validate User Information**
- THE system SHALL extract the userId and role from the token payload
- THE system SHALL verify the user account is still active (not suspended or deleted)
- IF the user account is not active, THEN THE system SHALL return HTTP 401 Unauthorized with error: "Account is not active"

**Step 6: Authorization Check (Role/Permission Based)**
- THE system SHALL extract the permissions array from the token
- THE system SHALL verify the permission required for this operation is in the permissions array
- IF the user lacks required permission, THEN THE system SHALL return HTTP 403 Forbidden with error: "You do not have permission to perform this operation"

**Step 7: Resource Ownership Verification (for resource-specific operations)**
- THE system SHALL verify the user attempting to access a resource (todo, account data) is the owner
- IF the user is not the owner, THEN THE system SHALL return HTTP 403 Forbidden with error: "You do not have permission to access this resource"
- THIS verification is essential for ensuring data isolation between users

**Example Endpoint Protection Implementation:**
```javascript
// When endpoint processes request:
1. Extract JWT from Authorization header
2. Validate JWT signature, expiration, issuer
3. Extract userId and role from payload
4. Verify user account is active
5. Check if user has permission for this operation
6. If accessing specific resource, verify ownership
7. Proceed with request
8. If any check fails, return appropriate HTTP error response
```

---

## 5. Session Security

### 5.1 Server-Side Session Management

**Session Record Creation:**

WHEN a user successfully authenticates, THE system SHALL create a server-side session record containing:

- **Session ID**: Unique identifier for this session
- **User ID**: The authenticated user's identifier
- **Session Creation Timestamp**: When the session was created (UTC)
- **Session Expiration Time**: When the session will automatically expire
- **Last Activity Timestamp**: Last time the user made a request
- **IP Address**: Client IP address from login request
- **User Agent**: Browser/client information
- **Refresh Token Hash**: Hash of the refresh token (not the token itself)
- **Session Status**: Active, expired, or revoked

**Session Storage:**

THE session records SHALL be stored in a fast-access medium such as:
- In-memory cache with persistent database backup (recommended)
- Distributed session storage (Redis, Memcached)
- Or database with session table (less performant)

THE session storage SHALL maintain confidentiality and integrity of session data.

### 5.2 Session Timeout and Expiration

**Automatic Timeout:**

IF a session remains inactive for 30 days without any user activity, THE system SHALL automatically expire the session.

WHEN a session times out, THE system SHALL:
1. Invalidate the session record
2. Revoke any access tokens associated with the session
3. Revoke the refresh token
4. Require the user to log in again on next API request

**Inactivity Definition:**

"Inactivity" is defined as no API requests being made to the backend system for 30 consecutive days. THIS does not include time the user is actively using the client application without making requests.

**Activity Tracking:**

THE system SHALL update the "Last Activity Timestamp" in the session record whenever:
- The user makes an authenticated API request
- The user accesses a protected endpoint
- The user performs any action requiring authentication

**User Notification:**

WHERE practical, THE system MAY proactively notify users if:
- Their session is about to expire
- Suspicious activity is detected on their account
- Multiple login attempts are made from new devices

### 5.3 Concurrent Session Handling

**Multiple Simultaneous Sessions:**

THE system SHALL allow multiple concurrent sessions for the same user.

WHEN a user logs in from a new device/browser, THE system SHALL:
1. Create a new session record for the new login
2. Preserve all existing sessions on other devices/browsers
3. Issue new access and refresh tokens for the new session
4. NOT invalidate or interfere with existing sessions

**Viewing Active Sessions:**

WHERE the system provides session management features, USERS SHALL be able to view all their active sessions:
- Session creation date/time
- IP address (partially masked for privacy)
- Device/browser information
- Last activity time

**Managing Active Sessions:**

USERS MAY be able to logout from specific sessions (revoking that session while keeping others active):
- Select a session from the list
- Click "Logout from this session"
- That session is terminated, while other sessions remain active
- THE system logs this action in audit trails

**Force Logout from All Sessions:**

USERS SHALL have the ability to log out from all sessions simultaneously:
- Click "Logout from all sessions"
- All refresh tokens are revoked
- All sessions are terminated
- User must log in again on any device

### 5.4 Session Token Rotation (Optional Enhancement)

WHILE not required for minimum viable product, THE system architecture SHALL support session token rotation for enhanced security.

**Token Rotation Concept:**

WHEN token rotation is implemented, THE system SHALL:
- Generate a new access token on each API request
- Invalidate the previous token after the new one is issued
- Return the new token to the client
- Prevent replay attacks using expired tokens

**Implementation Note:**

Token rotation significantly increases security but adds complexity and performance overhead. This enhancement should be added if security analysis determines it necessary.

---

## 6. Data Access Control

### 6.1 Permission Enforcement

**Role-Based Access Control:**

THE system SHALL enforce role-based access control (RBAC) where permissions are assigned based on user role.

THE system supports two primary roles:
- **"user"**: Regular users who can manage their own todos
- **"admin"**: System administrators with elevated access

**Permission Matrix for Standard Users:**

THE system SHALL enforce the following permissions for users with the "user" role:

| Operation | Permission | Rationale |
|-----------|------------|-----------|
| Create own todos | ✅ ALLOWED | Core functionality |
| View own todos | ✅ ALLOWED | Core functionality |
| Update own todos | ✅ ALLOWED | Core functionality |
| Delete own todos | ✅ ALLOWED | Core functionality |
| Mark own todo complete | ✅ ALLOWED | Core functionality |
| View other users' todos | ❌ DENIED | Data isolation |
| Modify other users' todos | ❌ DENIED | Data isolation |
| Delete other users' todos | ❌ DENIED | Data isolation |
| Access admin dashboard | ❌ DENIED | Admin only |
| Manage user accounts | ❌ DENIED | Admin only |
| Access audit logs | ❌ DENIED | Admin only |
| Modify system settings | ❌ DENIED | Admin only |

**Permission Matrix for Admins:**

THE system SHALL enforce the following permissions for users with the "admin" role:

| Operation | Permission | Rationale |
|-----------|------------|-----------|
| All user permissions | ✅ ALLOWED | Admins can use app personally |
| View all users | ✅ ALLOWED | System administration |
| View specific user details | ✅ ALLOWED | User account management |
| Reset user passwords | ✅ ALLOWED | Account recovery |
| Suspend/activate accounts | ✅ ALLOWED | Account management |
| Delete user accounts | ✅ ALLOWED | Account lifecycle management |
| Access audit logs | ✅ ALLOWED | Security monitoring |
| View all todos (read-only) | ✅ ALLOWED | Support and investigation |
| Modify all todos | ❌ DENIED | Prevents data tampering |
| Modify system settings | ✅ ALLOWED | System configuration |
| View system statistics | ✅ ALLOWED | System monitoring |

**Permission Verification:**

EVERY API request SHALL include a permission verification step:

WHEN a user attempts to perform an operation:
1. THE system extracts the user's permissions from their JWT token
2. THE system determines what permission is required for the requested operation
3. THE system verifies the permission is in the user's permissions array
4. IF permission is present, THE system proceeds with the operation
5. IF permission is absent, THE system returns HTTP 403 Forbidden

### 6.2 User-Specific Data Filtering

**Data Isolation Enforcement:**

THE system SHALL ensure users can ONLY access data they own or are authorized to access.

**Filtering for Todo List Retrieval:**

WHEN a user requests their todo list, THE system SHALL:
1. Extract the user ID from the authenticated session
2. Query ONLY todos where the owner_user_id = authenticated_user_id
3. Return only the filtered results to the user
4. NEVER return todos belonging to other users

**Filtering at Multiple Levels:**

THE system SHALL enforce filtering at both application and database levels:

- **Application Level**: The API code verifies ownership before returning data
- **Database Level**: The database query includes WHERE clause filtering by user ID
- **Principle of Defense in Depth**: Multiple enforcement layers ensure protection if one fails

**Example Database Query (Secure):**
```sql
SELECT * FROM todos 
WHERE owner_user_id = ? 
AND todos.id = ?
-- Only returns if user owns this todo
```

**Preventing Direct ID Access:**

THE system SHALL prevent users from accessing data via direct ID if they don't own it:

- ❌ WRONG: Allow accessing `/api/todos/12345` if user_id=999 owns some todos
- ✅ CORRECT: Only return `/api/todos/12345` if user_id=999 owns todo 12345

### 6.3 Admin-Specific Access Controls

**Elevated Permissions for Admins:**

WHEN an admin user attempts to access admin-only endpoints, THE system SHALL:
1. Verify the user's role is "admin" (from JWT token)
2. Verify the permission required for this operation is in their permissions
3. Grant access if verification passes
4. Deny access with HTTP 403 Forbidden if verification fails

**Admin Data Access Restrictions:**

EVEN WITH elevated permissions, admins SHALL be subject to restrictions:

- Admins CAN view any user's account information (for support purposes)
- Admins CAN view any user's todos (read-only access for investigation)
- Admins SHALL NOT be able to modify/delete user todos (prevents accidental data loss)
- Admins SHALL NOT be able to impersonate users (no permission to use user's accounts)
- Admins SHALL NOT be able to modify other users' passwords directly (can reset, not change)

**Audit Trail for Admin Actions:**

EVERY admin action SHALL be logged with:
- Admin user ID
- Action performed
- Resource affected
- Timestamp
- IP address
- Reason (if provided)

THIS ensures full accountability for administrative actions.

---

## 7. Compliance Requirements

### 7.1 Data Protection Standards

**Data Protection Principles:**

THE system SHALL adhere to fundamental data protection principles:

1. **Lawfulness, Fairness, and Transparency**: User data is collected and processed fairly with user knowledge
2. **Purpose Limitation**: Data is used only for the purposes disclosed (todo management)
3. **Data Minimization**: Only data necessary for functionality is collected
4. **Accuracy**: User data is accurate and up-to-date
5. **Storage Limitation**: Data is retained only as long as necessary
6. **Integrity and Confidentiality**: Data is protected from unauthorized access or modification
7. **Accountability**: The system logs and can account for all data handling

### 7.2 GDPR Readiness (Where Applicable)

WHERE the application serves users in the European Union, THE system SHALL support GDPR compliance requirements:

**User Right to Access:**

THE system SHALL provide users with the ability to request and download all their personal data:
- Email address
- Account creation date
- All todos
- Account activity history
- All personal data stored about that user

**User Right to Deletion ("Right to Be Forgotten"):**

THE system SHALL allow users to request complete deletion of their account and all associated data:
1. User submits deletion request
2. System provides confirmation period (optional) to prevent accidental deletion
3. System permanently deletes user account and all personal data
4. System retains anonymized audit logs for compliance

**User Right to Data Portability:**

THE system SHALL allow users to download their data in a portable format (CSV, JSON):
1. User requests data export
2. System generates file with all user data
3. System provides download link
4. File contains todos in structured format that can be imported elsewhere

**Consent and Transparency:**

THE system SHALL provide clear, understandable information about:
- What data is collected
- How data is used
- How long data is retained
- What security measures protect data
- User rights regarding their data

### 7.3 Industry Best Practices

**OWASP Security Guidelines:**

THE system SHALL implement security controls recommended by OWASP (Open Web Application Security Project):

- **Authentication**: Strong password requirements, secure session management
- **Authorization**: Role-based access control, permission enforcement
- **Input Validation**: All user input validated and sanitized
- **Injection Prevention**: Parameterized queries, protected against SQL/command injection
- **Cryptography**: Strong encryption for data in transit and at rest
- **Error Handling**: Security exceptions handled without revealing system details
- **Logging and Monitoring**: Comprehensive audit logging of security events

**Security Headers:**

THE system SHALL include the following security headers in HTTP responses:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

These headers provide defense against common web vulnerabilities.

**Regular Security Audits:**

THE system SHALL be subject to regular security audits:
- Quarterly code review for security issues
- Annual penetration testing
- Dependency scanning for known vulnerabilities
- Security training for development team

---

## 8. Audit and Logging Requirements

### 8.1 Security Event Logging

**Events Requiring Audit Logs:**

THE system SHALL create comprehensive audit log entries for the following security-relevant events:

**Authentication Events:**
- **User Registration**: New account created
  - Log: email address, timestamp, IP address, success/failure
- **Successful Login**: User authenticated
  - Log: email, timestamp, IP address, device type
- **Failed Login Attempts**: User authentication failed
  - Log: attempted email (if provided), timestamp, IP address, reason for failure (but NOT attempted password)
- **User Logout**: User ended session
  - Log: user ID, timestamp, logout reason
- **Password Change**: User changed password
  - Log: user ID, timestamp, IP address
- **Password Reset Request**: User initiated password reset
  - Log: email address, timestamp, IP address, reset token generated (hashed, not plain)
- **Password Reset Completion**: User successfully reset password
  - Log: user ID, timestamp, IP address
- **Token Refresh**: Access token was refreshed
  - Log: user ID, timestamp (minimal)
- **Session Expiration**: Session automatically expired
  - Log: user ID, timestamp, reason

**Data Access Events:**
- **Todo List Retrieved**: User viewed their todo list
  - Log: user ID, timestamp, number of items retrieved, filters applied
- **Single Todo Retrieved**: User viewed individual todo
  - Log: user ID, todo ID, timestamp
- **Todo Created**: User created new todo
  - Log: user ID, todo ID, timestamp, todo title (first 100 chars)
- **Todo Updated**: User modified todo
  - Log: user ID, todo ID, timestamp, fields changed, old value → new value
- **Todo Marked Complete**: User marked todo as done
  - Log: user ID, todo ID, timestamp
- **Todo Marked Incomplete**: User unmarked completed todo
  - Log: user ID, todo ID, timestamp
- **Todo Deleted**: User deleted todo
  - Log: user ID, todo ID, timestamp, deleted todo title

**Administrative Events:**
- **User Account Modification**: Admin modified user account
  - Log: admin ID, user ID modified, timestamp, what was changed
- **User Password Reset (by Admin)**: Admin reset a user's password
  - Log: admin ID, user ID, timestamp, temporary password generated (hashed)
- **User Account Suspension**: Admin suspended a user account
  - Log: admin ID, user ID, timestamp, suspension reason
- **User Account Deletion**: Admin deleted a user account
  - Log: admin ID, user ID, timestamp, deletion reason
- **System Configuration Change**: Admin modified system settings
  - Log: admin ID, setting changed, old value → new value, timestamp
- **Audit Log Access**: Admin viewed audit logs
  - Log: admin ID, timestamp, filters applied, number of records viewed

**Security Events:**
- **Failed Login Attempts Exceeded**: Account locked due to too many failures
  - Log: email address, timestamp, IP address, number of failures
- **Suspicious Activity Detected**: System detected unusual pattern
  - Log: detection type, user ID (if applicable), timestamp, details
- **Token Validation Failure**: Invalid token rejected
  - Log: token type, failure reason, timestamp (do NOT log full token)
- **Permission Denied**: User attempted unauthorized operation
  - Log: user ID, operation attempted, resource ID, timestamp, reason

### 8.2 Audit Log Entry Structure

**Required Fields in Each Audit Log Entry:**

EVERY audit log entry SHALL contain:

```json
{
  "auditLogId": "unique-log-identifier",
  "timestamp": "2025-11-14T22:03:43.950Z",
  "userId": "user-who-performed-action",
  "actionType": "create_todo",
  "resourceType": "todo",
  "resourceId": "todo-identifier",
  "oldValue": null,
  "newValue": { "title": "Buy groceries", "description": "..." },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 ...",
  "status": "success",
  "errorMessage": null,
  "details": "Additional context about the action"
}
```

**Field Descriptions:**

- **auditLogId**: Globally unique identifier for this log entry
- **timestamp**: ISO 8601 formatted timestamp in UTC indicating when action occurred
- **userId**: ID of the user who performed the action (null for unauthenticated requests)
- **actionType**: Specific type of action performed (create_todo, login, password_reset, etc.)
- **resourceType**: Type of resource affected (user, todo, setting, etc.)
- **resourceId**: Specific ID of affected resource (todo_123, user_456, etc.)
- **oldValue**: Previous value (for update operations) or null
- **newValue**: New value (for create/update operations) or null
- **ipAddress**: IP address of the requester
- **userAgent**: Browser/client information
- **status**: Result status (success, failure, partial)
- **errorMessage**: If status is failure, description of error
- **details**: Additional context (reason for action, filters applied, etc.)

### 8.3 Audit Log Storage and Retention

**Storage Location:**

THE audit logs SHALL be stored in a secure, dedicated audit log storage:
- Separate from application data (separate database table or service)
- With restricted access (only admins can view)
- Protected from modification or deletion
- Encrypted at rest using AES-256

**Log Immutability:**

ONCE an audit log entry is written, THE system SHALL prevent modification or deletion of that entry.

THE system SHALL use database-level constraints or audit table triggers to ensure immutability.

**Retention Period:**

THE system SHALL retain audit logs for a minimum of 90 days.

THE system MAY be configured to retain logs longer (up to 2555 days / 7 years) for compliance purposes.

AFTER the retention period expires, THE system SHALL archive (compress and store) or permanently delete the logs per organizational policy.

**Storage Capacity Planning:**

THE system SHALL plan for audit log growth:
- Estimate: ~500 bytes per log entry
- With 1,000 users and 10 operations per user per day: ~5 MB per day
- 90-day retention: ~450 MB of audit logs

Storage capacity SHALL be provisioned accordingly.

### 8.4 Audit Log Viewing and Filtering

**Admin Access to Logs:**

ADMINS SHALL be able to access and review audit logs through an admin interface or API endpoints.

**Filtering Capabilities:**

WHEN viewing audit logs, ADMINS SHALL be able to filter by:
- **Date Range**: View logs between specific dates (e.g., last 7 days, last 30 days, custom range)
- **User ID**: View logs for actions by a specific user
- **Action Type**: Filter by specific action types (logins, todo creations, etc.)
- **Resource Type**: Filter by affected resource type (todos, users, settings)
- **Status**: Filter by success/failure status
- **IP Address**: Filter by client IP address
- **Error Messages**: Search for specific errors

**Search Functionality:**

ADMINS SHALL be able to search audit logs by:
- **Resource ID**: Find all actions affecting a specific resource
- **User Email**: Find logs for a specific user by email address
- **Free Text**: Search log entries for specific keywords or phrases

**Query Results:**

WHEN querying audit logs, THE system SHALL return:
- Paginated results (50-100 entries per page)
- Sort options (by timestamp, by user, by action type)
- Summary statistics (total results found, breakdown by action type, etc.)
- Export capability to CSV or JSON format for analysis

**Audit Log Pagination:**

THE system SHALL implement efficient pagination for large audit log datasets:
- Default page size: 50 entries
- Maximum page size: 1000 entries
- Support offset-based pagination or cursor-based pagination

### 8.5 Sensitive Information Protection in Logs

**What Shall NOT Be Logged:**

THE system SHALL NEVER log the following sensitive information:

- Plaintext passwords or password hashes
- Password reset tokens (log that reset occurred, not the token)
- Full authentication tokens or JWT tokens
- Session IDs in plain text
- Credit card numbers or financial information
- Social security numbers or national ID numbers
- Private encryption keys

**What Shall Be Sanitized in Logs:**

THE system SHALL sanitize the following information:

- Email addresses: Log user ID instead, or hash the email if correlation is needed
- Personal information: Log user ID instead of personal details
- Full request bodies: Log summary instead of complete body
- SQL queries: Log operation type instead of full query
- File paths: Log filename instead of full path

**Example of Proper Logging:**

- ❌ WRONG: `User password='mySecurePassword123' logged in`
- ✅ CORRECT: `User user_id=42 logged in successfully`

- ❌ WRONG: `Password reset token: a7fh2k8f7kh28fh2kh8f2k8h2k8h2k8 sent to user@example.com`
- ✅ CORRECT: `Password reset initiated for user_id=42, token sent to registered email`

### 8.6 Audit Log Monitoring and Alerts

**Automated Analysis:**

THE audit log monitoring system SHALL automatically analyze logs for suspicious patterns:

- **Failed Authentication Pattern**: More than 5 failed logins from same IP in 15 minutes → Alert
- **Unusual Admin Activity**: Admin actions outside normal business hours → Alert
- **Bulk Deletions**: Large number of deletions in short period → Alert
- **Unauthorized Access Attempts**: Repeated permission denied errors → Alert
- **Data Exfiltration Pattern**: Large export requests or mass downloads → Alert

**Alert Thresholds:**

| Pattern | Threshold | Action |
|---------|-----------|--------|
| Failed logins from same IP | >5 in 15 min | Account lockout + Alert |
| Admin access outside hours | After hours | Log for review |
| Bulk deletions | >100 in 1 hour | Pause & Alert |
| Unauthorized attempts | >10 in 1 hour | Log & Alert |

**Alert Notifications:**

WHEN an alert is triggered, THE system SHALL:
1. Create an alert record in a dedicated alerts table
2. Notify relevant admins via email or in-app notification
3. Include details about the suspicious activity
4. Provide quick action links (view logs, suspend account, etc.)
5. Log the alert generation itself

**Alert Retention:**

THE system SHALL retain alerts for minimum 30 days, allowing admins to review historical alerts and patterns.

---

## Summary: Security Architecture Overview

The Todo application implements a comprehensive, multi-layered security architecture:

```
┌─── AUTHENTICATION LAYER ────────────────────┐
│ • JWT Token-Based Authentication            │
│ • Access Token (15 min) + Refresh (7 days) │
│ • Password Hashing with bcrypt              │
│ • Session Management (30-day timeout)       │
└────────────────────────────────────────────┘
         ↓
┌─── ENCRYPTION LAYER ────────────────────────┐
│ • HTTPS/TLS 1.2+ for Data in Transit        │
│ • AES-256 for Sensitive Data at Rest        │
│ • Database-level encryption options         │
└────────────────────────────────────────────┘
         ↓
┌─── AUTHORIZATION LAYER ─────────────────────┐
│ • Role-Based Access Control (RBAC)          │
│ • User vs. Admin Permissions                │
│ • Data Ownership Verification               │
│ • Multi-layer enforcement                   │
└────────────────────────────────────────────┘
         ↓
┌─── API SECURITY LAYER ──────────────────────┐
│ • Strict CORS Policy                        │
│ • Input Validation & Sanitization           │
│ • Rate Limiting (100 req/min per user)      │
│ • SQL Injection Prevention                  │
│ • Request/Response Validation               │
└────────────────────────────────────────────┘
         ↓
┌─── AUDIT & MONITORING LAYER ────────────────┐
│ • Comprehensive Event Logging               │
│ • 90+ Day Log Retention                     │
│ • Suspicious Pattern Detection              │
│ • Admin Activity Tracking                   │
│ • Immutable Audit Trail                     │
└────────────────────────────────────────────┘
```

This layered approach ensures that even if one layer is compromised, additional layers provide protection.

---

> *Developer Note: This document defines **security and compliance requirements only**. All technical implementations (specific encryption libraries, certificate management, logging infrastructure, key management systems, etc.) are at the discretion of the development team. Choose security tools and frameworks that best fit your technology stack while meeting all requirements specified in this document.*