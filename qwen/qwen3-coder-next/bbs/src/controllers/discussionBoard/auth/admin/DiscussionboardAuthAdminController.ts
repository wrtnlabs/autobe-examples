import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller, Ip } from "@nestjs/common";
import typia from "typia";

import { IDiscussionBoardAdmin } from "../../../../api/structures/IDiscussionBoardAdmin";
import { postDiscussionBoardAuthAdminJoin } from "../../../../providers/postDiscussionBoardAuthAdminJoin";
import { postDiscussionBoardAuthAdminLogin } from "../../../../providers/postDiscussionBoardAuthAdminLogin";
import { postDiscussionBoardAuthAdminRefresh } from "../../../../providers/postDiscussionBoardAuthAdminRefresh";

@Controller("/discussionBoard/auth/admin")
export class DiscussionboardAuthAdminController {
  /**
   * Administrator registration endpoint that creates a new admin account in the discussion board system.
   *
   * ## Purpose and Overview
   *
   * This endpoint handles the registration of new administrator accounts for the discussion board platform. Unlike regular member registration, this endpoint is specifically designed for creating privileged administrative accounts with elevated permissions to manage content, users, and system configuration.
   *
   * The registration process follows a secure multi-step workflow that ensures only legitimate users can gain administrative access. The operation creates an admin account linked to an existing member account and assigns appropriate role permissions.
   *
   * ## Security Considerations and User Permissions
   *
   * ### Authentication Requirements
   *
   * - **Member Account Required**: The operation requires a valid member_id that references an existing user account
   * - **Admin Request Approval**: The member must have previously submitted and received approval for an administrator request
   * - **Role Assignment**: The admin_role_id references the specific permissions level being granted (regular admin or super admin)
   * - **Password Security**: Passwords must meet strong complexity requirements and are stored using bcrypt hashing
   *
   * ### Authorization Checks
   *
   * - **Registration Authority**: Only authorized system components can create admin accounts (not user-facing)
   * - **Email Uniqueness**: Each admin email must be unique across the system
   * - **Role Hierarchy**: Super admin creation requires verification of current super admin privileges
   *
   * ## Relationship to Database Entities
   *
   * ### Primary Entity: discussion_board_admins
   *
   * The operation creates a new record in the discussion_board_admins table with the following key fields:
   *
   * - **id**: Unique UUID identifier for the admin account
   * - **member_id**: Reference to the source member account that requested admin privileges
   * - **admin_role_id**: Reference to the assigned admin role defining permissions level
   * - **display_name**: Admin's public display name from the member profile
   * - **email**: Contact email for notifications and administrative communications
   * - **password_hash**: Secure bcrypt hash of the admin's password
   * - **bio**: Optional biography or profile description
   * - **status**: Account status (active, inactive, suspended)
   * - **assigned_at**: Timestamp when admin privileges were granted
   *
   * ### Related Entities
   *
   * #### discussion_board_admin_email_verifications
   *
   * After admin account creation, an email verification record is created in discussion_board_admin_email_verifications:
   *
   * - **admin_id**: Reference to the newly created admin account
   * - **token**: Cryptographically secure random token for email verification
   * - **expires_at**: Token expiration time (typically 24 hours from creation)
   * - **verified_at**: Timestamp when email is successfully verified (null initially)
   *
   * #### discussion_board_admin_sessions
   *
   * No initial session is created during registration, but subsequent login operations will create session records.
   *
   * #### discussion_board_admin_password_resets
   *
   * Password reset functionality is available through the discussion_board_admin_password_resets table but is not created during initial registration.
   *
   * ## Validation Rules and Business Logic
   *
   * ### Required Fields Validation
   *
   * - **member_id**: Must reference an existing discussion_board_members record
   * - **admin_role_id**: Must reference an existing discussion_board_admins_roles record
   * - **display_name**: Required string field for admin identification
   * - **email**: Required valid email format with uniqueness constraint
   * - **password_hash**: Required secure password hash (bcrypt)
   *
   * ### Business Logic Validation
   *
   * - **Email Uniqueness**: System checks for duplicate email addresses across all admin accounts
   * - **Role Validation**: Admin role must exist and be appropriate for admin creation
   * - **Member Status**: Source member account must be in good standing (not banned)
   * - **Request Status**: The corresponding admin request must be in approved status
   *
   * ### Security Validation
   *
   * - **Password Strength**: Password must meet complexity requirements (minimum length, character diversity)
   * - **Email Format**: Email must be valid format and from approved domains if domain restrictions apply
   * - **IP Logging**: Registration IP and user agent should be logged for security auditing
   *
   * ## Implementation Details
   *
   * ### Service Layer Logic
   *
   * 1. **Input Validation**:
   * - Verify member_id references existing active member
   * - Verify admin_role_id references valid admin role
   * - Validate email format and uniqueness
   * - Check password strength requirements
   *
   * 2. **Admin Account Creation**:
   * - Generate unique UUID for admin account
   * - Create bcrypt hash of provided password
   * - Create admin record with current timestamp for assigned_at
   * - Set initial status to 'active' or 'pending_email_verification'
   *
   * 3. **Email Verification**:
   * - Generate cryptographically secure random token
   * - Create email verification record with token and expiration
   * - Send verification email to admin email address
   *
   * 4. **Audit Logging**:
   * - Log admin creation event with IP address and user agent
   * - Record timestamp and source of admin request approval
   *
   * ### Database Queries
   *
   * ```typescript
   * // 1. Verify member exists and is in good standing
   * const member = await prisma.discussion_board_members.findUnique({
   * where: { id: member_id },
   * select: { id: true, banned: true, status: true }
   * });
   *
   * // 2. Verify admin role exists
   * const adminRole = await prisma.discussion_board_admins_roles.findUnique({
   * where: { id: admin_role_id }
   * });
   *
   * // 3. Check email uniqueness
   * const existingAdmin = await prisma.discussion_board_admins.findUnique({
   * where: { email: email }
   * });
   *
   * // 4. Create admin account
   * const admin = await prisma.discussion_board_admins.create({
   * data: {
   * id: crypto.randomUUID(),
   * member_id,
   * admin_role_id,
   * display_name,
   * email,
   * password_hash: bcrypt.hashSync(password, 10),
   * bio: bio || null,
   * status: 'active',
   * assigned_at: new Date()
   * }
   * });
   *
   * // 5. Create email verification record
   * await prisma.discussion_board_admin_email_verifications.create({
   * data: {
   * id: crypto.randomUUID(),
   * admin_id: admin.id,
   * token: crypto.randomUUID(),
   * expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
   * verified_at: null
   * }
   * });
   * ```
   *
   * ### Edge Cases and Error Handling
   *
   * 1. **Email Already Exists**: Return 409 Conflict with descriptive error
   * 2. **Invalid Member ID**: Return 404 Not Found
   * 3. **Invalid Admin Role**: Return 404 Not Found
   * 4. **Password Too Weak**: Return 400 Bad Request with strength requirements
   * 5. **Member Banned**: Return 403 Forbidden
   * 6. **Admin Request Not Approved**: Return 403 Forbidden
   *
   * ## Related Operations and Workflow Integration
   *
   * ### Dependent Operations
   *
   * - **Member Account Verification**: Admin registration should only be available after member account is verified
   * - **Admin Request Approval**: Admin registration typically follows approval of an administrator request
   *
   * ### Sequential Operations
   *
   * 1. **User registers as member** → Member account created in discussion_board_members
   * 2. **User submits admin request** → Request stored in discussion_board_admins_requests
   * 3. **Super admin approves request** → Request status updated, admin eligible to register
   * 4. **Admin account registration** → Admin account created in discussion_board_admins
   * 5. **Email verification** → Admin confirms email ownership
   * 6. **Admin login** → Session created in discussion_board_admin_sessions
   *
   * ## Security Considerations Within Schema Constraints
   *
   * ### Password Security
   *
   * - Passwords are stored using bcrypt hashing with appropriate cost factor
   * - Password reset functionality available through discussion_board_admin_password_resets table
   * - No plain-text password storage or transmission
   *
   * ### Session Management
   *
   * - No immediate session created during registration
   * - Admin must authenticate separately to create session
   * - All sessions tracked in discussion_board_admin_sessions for audit purposes
   *
   * ### Audit Trail
   *
   * - Admin creation logged with IP address and user agent
   * - Timestamps track when admin privileges were assigned
   * - Email verification status tracked for security compliance
   *
   * ## Summary
   *
   * This admin registration endpoint creates secure administrative accounts with appropriate permissions and integrates with the discussion board's comprehensive authentication and authorization system. The operation ensures only legitimate users with proper approval can gain administrative access while maintaining security best practices for password storage and session management.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Registration information for creating a new admin account.
   * @x-autobe-authorization-type join
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification The join operation creates a new admin account in the discussion_board_admins table. It validates that the email is not already in use, hashes the password using bcrypt, and creates the initial admin record with pending status. The operation should also create an initial entry in discussion_board_admin_email_verifications table for email confirmation workflow. The admin_role_id should be set to the default 'regular' admin role, and the member_id should reference the existing member account that submitted the admin request.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("join")
  public async join(
    @Ip()
    ip: string,
    @TypedBody()
    body: IDiscussionBoardAdmin.IJoin,
  ): Promise<IDiscussionBoardAdmin.IAuthorized> {
    try {
      return await postDiscussionBoardAuthAdminJoin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Administrator authentication endpoint that validates admin credentials and establishes secure authentication sessions.
   *
   * ## Purpose and Overview
   *
   * This endpoint handles the authentication of administrator accounts for the discussion board platform. It verifies admin credentials against the stored password hash, creates authentication sessions for security auditing, and returns JWT tokens for subsequent API authorization.
   *
   * The authentication process implements industry-standard security practices including credential validation, session management, and audit logging to ensure the integrity and traceability of administrative access to the platform.
   *
   * ## Security Considerations and User Permissions
   *
   * ### Authentication Requirements
   *
   * - **Admin Credentials**: Valid email address and password combination
   * - **Password Verification**: Password is verified against bcrypt-hashed password_hash in the database
   * - **Session Management**: Successful authentication creates session records in discussion_board_admin_sessions
   * - **Lockout Protection**: The system should implement rate limiting or account lockout after repeated failed attempts
   *
   * ### Authorization Checks
   *
   * - **Admin Account Status**: Admin account must be in active status (not banned or suspended)
   * - **Email Verification**: Admin must have verified their email address (verified_at field in discussion_board_admin_email_verifications)
   * - **Session Isolation**: Each login creates a distinct session with unique connection context
   *
   * ## Relationship to Database Entities
   *
   * ### Primary Entity: discussion_board_admins
   *
   * The operation queries the discussion_board_admins table with the following key fields:
   *
   * - **id**: Unique UUID identifier for the admin account
   * - **email**: Contact email used for authentication (with unique constraint)
   * - **password_hash**: bcrypt-hashed password for credential verification
   * - **status**: Account status must be 'active' for authentication
   * - **member_id**: Reference to the source member account
   * - **assigned_at**: Timestamp when admin privileges were granted
   *
   * ### Related Entities
   *
   * #### discussion_board_admin_sessions
   *
   * After successful authentication, a session record is created in discussion_board_admin_sessions:
   *
   * - **admin_id**: Reference to the authenticated admin account
   * - **ip**: Client IP address for security auditing
   * - **href**: URL where authentication was initiated
   * - **referrer**: Referrer URL if applicable
   * - **created_at**: Timestamp when session was created
   * - **expired_at**: Session expiration time (JWT token validity period)
   *
   * #### discussion_board_admin_email_verifications
   *
   * The system verifies email verification status through the admin's email verification record:
   *
   * - **verified_at**: Must be non-null for authentication to succeed
   * - **token**: Verification token (not directly used in login flow)
   * - **expires_at**: Token expiration for audit purposes
   *
   * #### discussion_board_admin_password_resets
   *
   * Password reset status can be checked through this table for security auditing, though not required for login:
   *
   * - **used_at**: Tracks if recent password resets occurred
   * - **expires_at**: Password reset token expiration
   *
   * ## Validation Rules and Business Logic
   *
   * ### Required Fields Validation
   *
   * - **email**: Required valid email format matching admin email
   * - **password**: Required string for credential verification
   *
   * ### Business Logic Validation
   *
   * - **Email Uniqueness**: System validates that email exists in discussion_board_admins
   * - **Status Check**: Admin account must not be banned or suspended
   * - **Email Verification**: Admin must have completed email verification process
   * - **Password Matching**: bcrypt comparison of provided password against stored password_hash
   *
   * ### Security Validation
   *
   * - **Rate Limiting**: Implement rate limiting to prevent brute force attacks
   * - **IP Logging**: Client IP address is logged for security auditing
   * - **User Agent Logging**: User agent string helps detect unauthorized access
   * - **Audit Trail**: All authentication attempts are logged for security monitoring
   *
   * ## Implementation Details
   *
   * ### Service Layer Logic
   *
   * 1. **Input Validation**:
   * - Verify email format and existence in admin table
   * - Validate password is provided and not empty
   *
   * 2. **Admin Lookup**:
   * - Query discussion_board_admins by email with unique constraint
   * - Verify admin account status is 'active'
   * - Check email verification status
   *
   * 3. **Credential Verification**:
   * - Compare bcrypt hash of provided password with stored password_hash
   * - Handle failed authentication attempts
   *
   * 4. **Session Creation**:
   * - Generate JWT access and refresh tokens
   * - Create session record with connection context
   * - Set appropriate expiration times
   *
   * 5. **Audit Logging**:
   * - Log successful authentication with IP and user agent
   * - Record timestamp and admin identifier
   *
   * ### Database Queries
   *
   * ```typescript
   * // 1. Find admin by email
   * const admin = await prisma.discussion_board_admins.findUnique({
   * where: { email: email },
   * select: {
   * id: true,
   * email: true,
   * password_hash: true,
   * status: true,
   * member_id: true
   * }
   * });
   *
   * // 2. Check email verification
   * const emailVerification = await prisma.discussion_board_admin_email_verifications.findFirst({
   * where: {
   * admin_id: admin.id,
   * verified_at: { not: null }
   * }
   * });
   *
   * // 3. Verify password
   * const isPasswordValid = bcrypt.compareSync(password, admin.password_hash);
   *
   * // 4. Create session
   * const session = await prisma.discussion_board_admin_sessions.create({
   * data: {
   * id: crypto.randomUUID(),
   * admin_id: admin.id,
   * ip: clientIp,
   * href: requestUrl,
   * referrer: referrerUrl || null,
   * created_at: new Date(),
   * expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
   * }
   * });
   * ```
   *
   * ### Edge Cases and Error Handling
   *
   * 1. **Invalid Email**: Return 401 Unauthorized with generic error
   * 2. **Invalid Password**: Return 401 Unauthorized with attempt logging
   * 3. **Account Not Active**: Return 403 Forbidden with status explanation
   * 4. **Email Not Verified**: Return 403 Forbidden requiring email verification
   * 5. **Rate Limit Exceeded**: Return 429 Too Many Requests
   * 6. **Session Creation Failure**: Return 500 Internal Server Error
   *
   * ## Related Operations and Workflow Integration
   *
   * ### Dependent Operations
   *
   * - **Email Verification**: Must be completed before successful login
   * - **Session Invalidation**: Password change invalidates all existing sessions
   *
   * ### Sequential Operations
   *
   * 1. **Admin Registration** → Admin account created in discussion_board_admins
   * 2. **Email Verification** → Email confirmed in discussion_board_admin_email_verifications
   * 3. **Admin Login** → Session created in discussion_board_admin_sessions
   * 4. **Session Refresh** → New tokens generated using refresh token
   * 5. **Admin Logout** → Session terminated (client-side token discard)
   *
   * ### Parallel Operations
   *
   * - **Profile Information**: Can be retrieved concurrently after authentication
   * - **Permission Check**: Admin role permissions verified per request
   *
   * ## Security Considerations Within Schema Constraints
   *
   * ### Password Security
   *
   * - bcrypt hashing provides strong password protection
   * - Password reset functionality available for compromised accounts
   * - No password storage or transmission in plain text
   *
   * ### Session Management
   *
   * - JWT tokens provide stateless authentication
   * - Session records enable security auditing and tracking
   * - Session expiration prevents unauthorized long-term access
   * - Password changes invalidate all sessions for security
   *
   * ### Audit Trail
   *
   * - All login attempts logged with IP and user agent
   * - Session records provide detailed access tracking
   * - Timestamps enable security analysis and monitoring
   *
   * ## Summary
   *
   * This admin authentication endpoint provides secure credential-based authentication for administrator accounts. The operation integrates with the discussion board's comprehensive session management and audit logging systems to ensure secure, traceable access to administrative features. All authentication activities are logged for security auditing and compliance purposes.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Authentication credentials for admin login.
   * @x-autobe-authorization-type login
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification The login operation validates admin credentials against the discussion_board_admins table. It verifies the provided email and password_hash match an existing admin record, creates a session entry in discussion_board_admin_sessions, and generates JWT tokens for subsequent API requests. The operation should also check admin status and handle lockout scenarios after failed attempts.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("login")
  public async login(
    @Ip()
    ip: string,
    @TypedBody()
    body: IDiscussionBoardAdmin.ILogin,
  ): Promise<IDiscussionBoardAdmin.IAuthorized> {
    try {
      return await postDiscussionBoardAuthAdminLogin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Administrator token refresh endpoint that issues new authentication tokens using refresh tokens.
   *
   * ## Purpose and Overview
   *
   * This endpoint handles the refresh of authentication tokens for administrator accounts on the discussion board platform. It validates refresh tokens against active sessions, generates new JWT tokens (both access and refresh tokens), and maintains secure session management through token rotation.
   *
   * The token refresh mechanism provides a balance between security and user experience by allowing extended authentication sessions while implementing security best practices like token rotation and expiration management.
   *
   * ## Security Considerations and User Permissions
   *
   * ### Token Refresh Requirements
   *
   * - **Refresh Token Validation**: Valid refresh token must be provided in the request
   * - **Session Verification**: Refresh token must correspond to an active session in discussion_board_admin_sessions
   * - **Token Rotation**: New tokens are issued on each refresh to implement security best practices
   * - **Session Expiration**: Tokens cannot be refreshed after session expiration
   *
   * ### Authorization Checks
   *
   * - **Active Session**: The session must not be expired (expired_at must be in the future)
   * - **Session Status**: Session must not be revoked or invalidated
   * - **Admin Account Status**: Associated admin account must remain in active status
   *
   * ## Relationship to Database Entities
   *
   * ### Primary Entity: discussion_board_admin_sessions
   *
   * The operation queries and updates the discussion_board_admin_sessions table:
   *
   * - **admin_id**: Reference to the admin account for the session
   * - **ip**: Client IP address (logged for security auditing)
   * - **href**: URL where session was initiated
   * - **referrer**: Referrer URL if applicable
   * - **created_at**: Session creation timestamp
   * - **expired_at**: Session expiration time (must be in future for refresh)
   *
   * ### Token Management
   *
   * #### JWT Token Structure
   *
   * The system generates two types of tokens:
   *
   * - **Access Token**: Short-lived token (typically 1 hour) used for API authorization
   * - **Refresh Token**: Longer-lived token (typically 24 hours) used to obtain new access tokens
   *
   * #### Token Storage
   *
   * Tokens are not stored in the database for security reasons. Instead, the system:
   *
   * - Validates refresh token format and signature
   * - Verifies token expiration against session expired_at
   * - Checks session validity against database records
   *
   * ## Validation Rules and Business Logic
   *
   * ### Required Fields Validation
   *
   * - **refreshToken**: Required valid refresh token string
   * - **format**: Token must be properly formatted JWT token
   *
   * ### Business Logic Validation
   *
   * - **Session Existence**: Refresh token must correspond to an active session
   * - **Expiration Check**: Session must not be expired (expired_at > current time)
   * - **Token Validity**: Refresh token must be cryptographically valid
   * - **Admin Status**: Admin account must not be banned or suspended
   *
   * ### Security Validation
   *
   * - **Token Rotation**: New tokens issued on each refresh to prevent token theft
   * - **Session Integrity**: Session metadata updated to track refresh activities
   * - **Audit Logging**: All token refresh activities logged for security auditing
   *
   * ## Implementation Details
   *
   * ### Service Layer Logic
   *
   * 1. **Input Validation**:
   * - Verify refresh token format and structure
   * - Decode JWT token to extract payload
   * - Validate token signature and expiration
   *
   * 2. **Session Verification**:
   * - Query discussion_board_admin_sessions by admin_id from token
   * - Verify session is not expired (expired_at > now)
   * - Check admin account status
   *
   * 3. **Token Generation**:
   * - Generate new access token with 1-hour expiration
   * - Generate new refresh token with 24-hour expiration
   * - Implement token rotation for security
   *
   * 4. **Session Update**:
   * - Update session metadata if needed
   * - Log refresh activity for audit trail
   *
   * ### Database Queries
   *
   * ```typescript
   * // 1. Decode and verify refresh token
   * const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
   * const adminId = decoded.adminId;
   *
   * // 2. Find active session
   * const session = await prisma.discussion_board_admin_sessions.findFirst({
   * where: {
   * admin_id: adminId,
   * expired_at: { gt: new Date() }
   * },
   * orderBy: { created_at: 'desc' }
   * });
   *
   * // 3. Verify admin status
   * const admin = await prisma.discussion_board_admins.findUnique({
   * where: { id: adminId },
   * select: { status: true }
   * });
   *
   * // 4. Generate new tokens
   * const newAccessToken = jwt.sign(
   * { adminId, role: adminRole },
   * process.env.JWT_SECRET,
   * { expiresIn: '1h' }
   * );
   *
   * const newRefreshToken = jwt.sign(
   * { adminId },
   * process.env.JWT_SECRET,
   * { expiresIn: '24h' }
   * );
   * ```
   *
   * ### Edge Cases and Error Handling
   *
   * 1. **Invalid Refresh Token**: Return 401 Unauthorized
   * 2. **Expired Session**: Return 401 Unauthorized with message to re-login
   * 3. **Account Banned**: Return 403 Forbidden with explanation
   * 4. **Session Not Found**: Return 401 Unauthorized
   * 5. **Token Decode Failure**: Return 401 Unauthorized
   *
   * ## Related Operations and Workflow Integration
   *
   * ### Dependent Operations
   *
   * - **Login Operation**: Initial authentication creates session and tokens
   * - **Logout Operation**: Invalidates session (client-side token discard)
   *
   * ### Sequential Operations
   *
   * 1. **Admin Login** → Initial tokens generated and session created
   * 2. **API Requests** → Access token used for authorization
   * 3. **Token Refresh** → New tokens issued using refresh token
   * 4. **Repeat** → Steps 2-3 continue until session expires
   *
   * ### Parallel Operations
   *
   * - **Profile Information**: Can be retrieved concurrently after token refresh
   * - **Permission Verification**: Admin role permissions checked per request
   *
   * ## Security Considerations Within Schema Constraints
   *
   * ### Token Security
   *
   * - JWT tokens provide stateless authentication
   * - Token rotation implemented for security
   * - Refresh tokens have longer expiration but are rotated
   *
   * ### Session Management
   *
   * - Session records in discussion_board_admin_sessions enable tracking
   * - Expiration times enforced at application level
   * - Admin status checked on each token refresh
   *
   * ### Audit Trail
   *
   * - Token refresh activities logged for security auditing
   * - IP addresses and user agents tracked
   * - Timestamps enable security analysis
   *
   * ## Summary
   *
   * This admin token refresh endpoint provides secure authentication token renewal for administrator accounts. The operation implements industry-standard token rotation practices while maintaining security through session validation and audit logging. The system balances convenience with security by allowing extended authentication sessions while protecting against token theft and unauthorized access.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Refresh token for obtaining new authentication tokens.
   * @x-autobe-authorization-type refresh
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification The refresh operation validates refresh tokens and issues new JWT tokens for admin sessions. It verifies the provided refresh token against stored session records in discussion_board_admin_sessions, generates new access and refresh tokens, and updates session metadata. The operation supports token rotation for enhanced security and maintains audit trails for token refresh activities.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("refresh")
  public async refresh(
    @TypedBody()
    body: IDiscussionBoardAdmin.IRefresh,
  ): Promise<IDiscussionBoardAdmin.IAuthorized> {
    try {
      return await postDiscussionBoardAuthAdminRefresh({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
