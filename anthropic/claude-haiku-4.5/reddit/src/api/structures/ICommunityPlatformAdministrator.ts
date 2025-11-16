import { tags } from "typia";

import { ICommunityPlatformMember } from "./ICommunityPlatformMember";

export namespace ICommunityPlatformAdministrator {
  /**
   * Administrator account creation request for platform-level management
   * account registration.
   *
   * Represents the credentials and context required to create a new platform
   * administrator account with system-wide management capabilities.
   * Administrators created through this operation can immediately access
   * platform management functions including user suspension, community
   * removal, report review, analytics access, and platform configuration.
   *
   * The registration process captures session context (href, referrer, ip) to
   * establish an audit trail of administrative account creation. This context
   * tracking is essential for compliance monitoring and security
   * investigations into administrative account provisioning.
   *
   * Password is accepted as plain text and securely hashed by the backend
   * using bcrypt before storage in the database. The email address and
   * username must both be unique within the platform to prevent duplicate
   * administrator accounts.
   *
   * The operation generates and issues initial JWT tokens (access and
   * refresh) immediately upon successful account creation, enabling the new
   * administrator to begin platform management operations without requiring a
   * separate login step.
   */
  export type ICreate = {
    /**
     * Administrator email address for authentication and communication.
     * Must be unique across all administrator accounts in the system. Used
     * as the primary identifier for login credentials.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for administrator account authentication. Backend
     * will hash securely using bcrypt (cost factor 12) before storage in
     * the password_hash field.
     *
     * Must meet platform security requirements for strong passwords
     * including sufficient length (minimum 8 characters), complexity, and
     * entropy. Password must not be stored or logged in plaintext after
     * receipt by backend.
     */
    password: string & tags.MinLength<8>;

    /**
     * Unique administrator identifier for system-wide uniqueness and audit
     * accountability. Immutable after account creation - cannot be
     * changed.
     *
     * Appears in all audit logs, moderation records, and administrative
     * actions to ensure accountability for administrative decisions. Used
     * internally to track which administrator performed each system action.
     * Must be unique within the platform to prevent duplicate identifiers.
     */
    username: string & tags.MinLength<3> & tags.MaxLength<50>;

    /**
     * Administrator's display name for identification and audit trails.
     * Shows who performed administrative actions in system logs and
     * moderation records.
     */
    name: string & tags.MinLength<1> & tags.MaxLength<255>;

    /**
     * Connection URL (current page URL) for session context tracking.
     * Required for audit trail of administrative registration to understand
     * the context of account creation.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer URL from the registration context. Identifies the
     * referring source for administrative account creation. May be null or
     * empty string if not provided by client during registration flow.
     *
     * Used for session context tracking to establish complete picture of
     * administrative account provisioning for audit and compliance
     * purposes.
     */
    referrer?: string | null | undefined;

    /**
     * Client IP address for session tracking and audit purposes. Optional -
     * server can extract from request headers, but client may provide for
     * SSR scenarios. When provided, validates IPv4 or IPv6 format.
     */
    ip?: string | null | undefined;
  };

  /**
   * Administrator authorization response containing authenticated
   * administrator information and JWT tokens. Returned upon successful login
   * or token refresh.
   *
   * The authorized response includes the administrator's unique identifier
   * and comprehensive token information for maintaining authenticated
   * sessions. The id field identifies which administrator account has been
   * authenticated, enabling the backend to associate subsequent requests with
   * the correct administrator.
   *
   * The token object contains both access and refresh tokens. Access tokens
   * are short-lived and included in Authorization headers for API requests to
   * protected endpoints. Refresh tokens are longer-lived and used only at the
   * refresh endpoint to obtain new access tokens when current tokens expire.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated administrator. UUID format
     * uniquely identifies the administrator account within the system.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator's email address for authentication and critical
     * notifications. Must be unique to ensure single admin per email. Used
     * for password recovery and emergency communications.
     */
    email: string & tags.Format<"email">;

    /**
     * Unique administrator identifier (3-50 characters). Immutable. Appears
     * in audit logs and administrative actions for accountability.
     */
    username: string & tags.MinLength<3> & tags.MaxLength<50>;

    /**
     * Email verification status. Administrators must verify email before
     * accessing admin dashboard. Prevents unauthorized admin account
     * creation.
     */
    email_verified: boolean;

    /**
     * Current account state controlling administrator access to the
     * platform. States track the lifecycle of administrator accounts from
     * active operation through suspension and deletion.
     */
    account_status: "active" | "suspended" | "pending_deletion" | "deleted";

    /**
     * Account creation timestamp. Immutable record of when admin account
     * was provisioned.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last account modification timestamp. Updated when email, password, or
     * status changes. Maintained for audit compliance.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft-delete timestamp. Null if active. Set during deletion request,
     * enabling 7-day recovery window for admin accounts. Prevents
     * accidental admin removal.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: ICommunityPlatformMember;
  };

  /**
   * Administrator login credentials for platform authentication. Collects
   * email, password, and session context information (IP, referrer, URL)
   * required to authenticate administrator accounts and establish
   * authenticated sessions.
   *
   * The login request captures administrator credentials (email and password)
   * used to validate against registered administrator accounts. The password
   * is provided in plain text by the client and validated server-side against
   * the securely stored bcrypt password hash, ensuring credentials remain
   * protected during transmission and storage.
   *
   * Session context fields (ip, href, referrer) provide tracking information
   * for the login session. These fields enable audit trails and security
   * monitoring of administrative access patterns, recording where privileged
   * access originates from and what triggered the login request.
   *
   * Administrators must provide valid email and password credentials matching
   * an active administrator account. Failed authentication returns
   * appropriate error responses without revealing whether the email exists in
   * the system, following security best practices. Successful authentication
   * results in JWT token issuance for subsequent authenticated operations.
   */
  export type ILogin = {
    /**
     * Administrator's email address for authentication. Must correspond to
     * a registered administrator account in the system. Used to locate the
     * administrator record for credential validation.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for authentication. Backend validates this
     * against the securely stored password_hash using bcrypt verification.
     * Never stored or logged in plaintext.
     */
    password: string & tags.Format<"password">;

    /**
     * Client IP address from which the login request originates. Used for
     * session tracking and security auditing. Optional as server can
     * extract from request headers for standard HTTP requests.
     */
    ip?: string | null | undefined;

    /**
     * URL of the page where administrator login occurred. Captures the
     * admin dashboard or control panel location. Required for session
     * context tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer from the login request. Identifies the referring source
     * for administrative access. May be empty string if not provided by
     * client.
     */
    referrer: string;
  };

  /**
   * Token refresh request containing valid refresh token for obtaining new
   * access token. Enables administrators to extend their authenticated
   * sessions without full re-authentication.
   *
   * The refresh request accepts a refresh token previously issued through
   * login or registration endpoints. The token is validated server-side to
   * ensure it is authentic, unexpired, and associated with an active
   * administrator account that has not been suspended or deleted.
   *
   * When validation succeeds, the operation issues a new access token with
   * refreshed expiration time. The new token contains the same administrator
   * claims as the original, preserving system-wide management authorization
   * scope. This allows administrators to maintain continuous authenticated
   * sessions during extended platform management operations.
   */
  export type IRefresh = {
    /**
     * Valid refresh token issued during administrator login or
     * registration. The refresh token must be unexpired and associated with
     * an active administrator account. Used to validate administrator
     * identity and issue new access tokens.
     */
    refresh_token: string;
  };

  /**
   * Response confirming successful termination of administrator
   * authentication session.
   *
   * Returned after administrator logout to acknowledge that the session has
   * been invalidated, tokens have been revoked, and the administrator is no
   * longer authenticated.
   *
   * This response indicates completion of the logout workflow and readiness
   * for the administrator to re-authenticate if needed for further
   * administrative tasks.
   */
  export type ILogoutResponse = {
    /**
     * Indicates whether the logout operation was completed successfully.
     * True means the session has been terminated and the authentication
     * tokens are invalidated.
     */
    success: boolean;

    /**
     * Human-readable confirmation message indicating the session has been
     * terminated successfully.
     */
    message: string;
  };

  /**
   * Request body for initiating an administrator password reset process.
   * Contains only the administrator's email address, which is used to
   * identify the account and send a secure password reset link. This
   * operation does not require authentication as the administrator may have
   * lost access to their account. The system validates the email format and
   * checks if it corresponds to an active administrator account in the
   * system.
   */
  export type IPasswordResetRequest = {
    /**
     * Administrator email address registered in the
     * community_platform_administrators table. Used to identify the
     * administrator account and send the password reset link. Must be in
     * valid RFC 5322 email format. This is the only required information to
     * initiate the password reset workflow.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Response body for the password reset request operation. Contains a
   * generic success message confirming that a password reset email has been
   * sent. The message is intentionally generic to prevent attackers from
   * using this endpoint to enumerate which email addresses are registered as
   * administrators in the system. Security implementation follows the
   * principle of not revealing whether an email address exists in the
   * database through this endpoint.
   */
  export type IPasswordResetResponse = {
    /**
     * Generic success message indicating that a password reset email has
     * been sent (or would be sent if the email exists in the system).
     * Returns a consistent message regardless of whether the email exists
     * to prevent email enumeration attacks. Message format: 'If this email
     * exists in our system, a password reset link has been sent to it.
     * Please check your email.'
     */
    message: string;
  };

  /**
   * Request body for confirming and completing a platform administrator
   * password reset using a reset token.
   *
   * This DTO is used when an administrator has requested a password reset and
   * received a reset token via email. The administrator provides the reset
   * token along with their new desired password. The backend validates the
   * token's validity, expiration status, and password requirements before
   * updating the administrator's password hash.
   *
   * The reset token is a single-use credential that becomes invalid after
   * confirmation or expiration. Upon successful confirmation, the token is
   * invalidated and cannot be reused.
   */
  export type IPasswordResetConfirm = {
    /**
     * Single-use password reset token that was sent to the administrator's
     * email address. This token is cryptographically generated,
     * time-limited, and becomes invalid after successful confirmation or
     * upon expiration. The token must be valid and not expired to process
     * the password reset.
     */
    reset_token: string;

    /**
     * New password for the administrator account. Must meet security
     * requirements including minimum length of 8 characters and sufficient
     * complexity. The password will be hashed using bcrypt with cost factor
     * 12 before storage. Plain text password is accepted in the request;
     * hashing is performed server-side.
     */
    new_password: string & tags.MinLength<8>;
  };

  /**
   * Response body confirming successful password reset completion for a
   * platform administrator.
   *
   * This DTO is returned after a password reset confirmation request has been
   * successfully processed. It provides basic administrator information and
   * confirms that the password has been updated. The response includes the
   * administrator's ID and email for verification purposes.
   *
   * After successful confirmation, the administrator's password hash has been
   * updated with the new password (hashed using bcrypt with cost factor 12),
   * making the old password invalid. The administrator can immediately
   * authenticate using their new password.
   */
  export type IPasswordResetConfirmResponse = {
    /**
     * Unique identifier of the administrator account whose password was
     * successfully reset. Returned as confirmation that the password reset
     * was applied to the correct administrator.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address of the administrator account. Returned for confirmation
     * and reference purposes.
     */
    email: string & tags.Format<"email">;

    /**
     * Confirmation flag indicating whether the password reset was
     * successfully completed. Always true when this response is returned
     * (unsuccessful operations return error responses instead).
     */
    success: boolean;

    /**
     * Human-readable confirmation message indicating that the password
     * reset has been completed successfully and the administrator can now
     * log in with their new password.
     */
    message: string;
  };

  /**
   * Request body for authenticated administrator password change operation.
   * Allows an authenticated platform administrator to update their password
   * by providing their current password for verification and entering a new
   * password with confirmation. The current password is validated against the
   * stored hash, and upon successful validation, the new password is hashed
   * and stored in the community_platform_administrators table.
   *
   * This operation enforces password complexity requirements including
   * minimum length, character diversity, and history validation. Rate
   * limiting is applied to prevent brute force attacks on password change
   * attempts.
   *
   * All three fields (current, new, confirm) are required. The new password
   * must meet security standards with minimum 8 characters including
   * uppercase, lowercase, and numeric characters.
   */
  export type IPasswordChange = {
    /**
     * The administrator's current password in plain text. Used for
     * verification to ensure the password change request is authorized by
     * the account holder. Must match the existing password hash stored in
     * the database. Minimum 8 characters required for password security
     * validation.
     */
    current_password: string & tags.MinLength<8>;

    /**
     * The new password for the administrator account in plain text. Must
     * meet security requirements: minimum 8 characters, containing
     * uppercase letters, lowercase letters, and numbers. The backend will
     * hash this password using bcrypt with cost factor 12 before storing in
     * the database password_hashed field.
     */
    new_password: string & tags.MinLength<8>;

    /**
     * Confirmation of the new password. Must exactly match the new_password
     * field to prevent accidental typos during password entry. Both fields
     * must be identical or the request will be rejected.
     */
    new_password_confirm: string & tags.MinLength<8>;
  };

  /**
   * Response body confirming successful password change for an authenticated
   * administrator. Returns the administrator's ID and email for confirmation,
   * along with the account update timestamp and a success message.
   *
   * This response indicates that the current password was validated
   * successfully, the new password met all security requirements, and the
   * password hash has been updated in the community_platform_administrators
   * table. The account_updated_at timestamp reflects the exact moment of the
   * password change operation.
   *
   * This response does NOT include the administrator's password, password
   * hash, or any sensitive authentication data. The response is suitable for
   * returning to the client as confirmation of the operation's completion.
   */
  export type IPasswordChangeResponse = {
    /**
     * Unique identifier of the administrator account whose password was
     * successfully changed. Returned for reference and audit purposes.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address associated with the administrator account. Returned to
     * confirm which account's password was updated.
     */
    email: string & tags.Format<"email">;

    /**
     * ISO 8601 timestamp indicating when the administrator's account was
     * last updated. Set to the current time when the password change is
     * successfully completed.
     */
    account_updated_at: string & tags.Format<"date-time">;

    /**
     * Human-readable confirmation message indicating successful password
     * change. Example: 'Password changed successfully.'
     */
    message: string;
  };

  /**
   * Request payload for initiating email verification for platform
   * administrators.
   *
   * This request contains the email address where the verification token
   * should be sent, along with session context information necessary to
   * establish an administrative session for audit and compliance purposes.
   *
   * The operation validates that the email corresponds to an active
   * administrator account before sending the verification message. A unique,
   * time-limited verification token is generated and sent to the specified
   * email address. Session context fields (href, referrer, and optional ip)
   * are required to create a proper session record in the
   * administrator_sessions table, enabling comprehensive audit trails of
   * administrative actions.
   */
  export type IEmailVerifySendRequest = {
    /**
     * Administrator's email address for which to send the verification
     * message. This email address must be registered with the administrator
     * account. The verification token will be sent to this address.
     */
    email: string & tags.Format<"email">;

    /**
     * Client IP address from which the verification email request is being
     * initiated. This is connection metadata used for session tracking and
     * security audit purposes. The IP can be in IPv4 or IPv6 format.
     *
     * While the server can extract the IP address from the HTTP request,
     * clients may provide this value explicitly for server-side rendering
     * (SSR) scenarios where the request originates from a backend service
     * rather than the direct browser connection.
     *
     * This field is optional and used to populate the ip field in the
     * administrator_sessions table for session records.
     */
    ip?: string | null | undefined;

    /**
     * The URL of the current page where the verification email request
     * originated. This represents the connection location and is essential
     * session context metadata required to establish proper session
     * records.
     *
     * The href should be the complete URL path where the user initiated the
     * email verification process (e.g.,
     * "https://admin.example.com/security/email-verify"). This enables the
     * system to track where administrative actions originated from and is
     * mandatory for session management.
     *
     * This field is required and used to populate the href field in the
     * administrator_sessions table for session audit trail purposes.
     */
    href: string;

    /**
     * The URL of the previous page that referred the user to the current
     * verification page. This represents the referral context and is
     * essential session metadata required for session record creation.
     *
     * The referrer documents the navigation path that led to the email
     * verification initiation. It can be an empty string if the user
     * accessed the page directly (direct navigation without referrer). This
     * enables comprehensive audit trails for administrative actions.
     *
     * This field is required and used to populate the referrer field in the
     * administrator_sessions table for session tracking and analysis
     * purposes.
     */
    referrer: string;
  };

  /**
   * Response payload confirming successful email verification message
   * delivery for platform administrators.
   *
   * This response confirms that the verification email has been successfully
   * sent and provides details about the verification token validity period.
   * It includes the email address where the verification message was
   * delivered and the time window during which the administrator can complete
   * the verification process.
   *
   * Administrators should check their inbox (and spam folder) for the
   * verification email containing the unique token. The token must be used
   * with the email verification confirmation endpoint within the specified
   * expiration period.
   */
  export type IEmailVerifySendResponse = {
    /**
     * Confirmation message indicating that the verification email has been
     * sent successfully to the administrator's registered email address.
     */
    message: string;

    /**
     * The email address to which the verification message was sent. This
     * confirms the destination of the verification token.
     */
    email_sent_to: string & tags.Format<"email">;

    /**
     * The number of hours during which the verification token remains
     * valid. After this period expires, a new verification email must be
     * requested.
     */
    expires_in_hours: number & tags.Type<"int32"> & tags.Minimum<1>;
  };

  /**
   * Request payload for confirming administrator email verification.
   *
   * This request type is used when an administrator submits a verification
   * token received via email to confirm ownership and control of their email
   * address. The request contains the verification token necessary to
   * complete the email verification workflow.
   *
   * The authenticated administrator's identity is extracted from the JWT
   * token in the Authorization header - the administrator_id is NOT provided
   * in the request body. This prevents impersonation attacks where clients
   * could attempt to verify email for different administrator accounts.
   *
   * The operation validates the verification token against stored tokens,
   * checks token expiration, and verifies it matches the authenticated
   * administrator's account. Upon successful validation, the administrator's
   * email_verified status is updated to true.
   *
   * Security measures include token expiration enforcement, single-use token
   * validation, and rate limiting to prevent brute-force attacks. Failed
   * verification attempts are logged for security auditing.
   */
  export type IEmailVerifyConfirmRequest = {
    /**
     * Email verification token sent to the administrator's email address.
     * This token uniquely identifies the email verification request and is
     * validated against stored tokens to ensure authenticity and prevent
     * unauthorized email verification attempts.
     *
     * The token is generated by the system during the email verification
     * initiation and transmitted to the administrator via email. It has an
     * expiration time (typically 24 hours) to limit the window for
     * verification. Tokens are single-use - after successful verification,
     * the token is invalidated to prevent replay attacks.
     *
     * Token validation includes checking expiration time, verifying the
     * token matches the stored value, and ensuring it corresponds to the
     * administrator's account.
     */
    verification_token: string;
  };

  /**
   * Response payload confirming successful email verification for a platform
   * administrator.
   *
   * This response is returned when an administrator successfully completes
   * the email verification workflow by providing a valid verification token.
   * The response contains updated administrator account information
   * reflecting the completion of email verification.
   *
   * The response confirms that the administrator's email address has been
   * verified (email_verified set to true) and provides the current state of
   * the administrator's account. This enables the administrator to proceed
   * with platform operations that require email verification.
   *
   * The response includes the administrator's ID, verified email address,
   * verification status, username for audit trail purposes, account status
   * for operational control, and timestamps for audit compliance. These
   * fields provide comprehensive visibility into the administrator's account
   * state following successful email verification.
   */
  export type IEmailVerifyConfirmResponse = {
    /**
     * Unique identifier of the platform administrator account. This is the
     * primary key for the administrator record and provides the
     * authoritative reference for this administrator in all platform
     * operations.
     *
     * The administrator ID is immutable and used throughout the system to
     * identify and reference this specific administrator account.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Verified email address of the platform administrator. This email
     * address has been confirmed through the email verification workflow,
     * proving that the administrator has legitimate access to and control
     * over this mailbox.
     *
     * The email address is used for critical security notifications,
     * account recovery, and other email-dependent platform features. Email
     * verification must be completed before administrators can access these
     * features.
     */
    email: string & tags.Format<"email">;

    /**
     * Unique administrator identifier (3-50 characters) used for
     * authentication and audit trail purposes. The username is immutable
     * once set and appears in all administrative action logs for
     * accountability and compliance tracking.
     *
     * This field is essential for identifying which administrator performed
     * specific platform actions, enabling comprehensive security auditing
     * and administrative accountability.
     */
    username: string;

    /**
     * Flag indicating whether the administrator's email address has been
     * verified. A value of true indicates successful completion of the
     * email verification workflow, confirming that the administrator
     * controls the registered email address.
     *
     * This flag serves as a prerequisite for various security-sensitive
     * operations within the platform. Administrators with unverified emails
     * have limited access to email-dependent features such as password
     * recovery via email and critical security notifications.
     */
    email_verified: boolean;

    /**
     * Current operational status of the administrator account. Valid values
     * include 'active' (operational), 'suspended' (temporary disable),
     * 'pending_deletion' (awaiting final deletion), and 'deleted'
     * (soft-deleted).
     *
     * The account status controls whether the administrator has access to
     * platform management functions. Only administrators with 'active'
     * status can perform administrative operations. This field is essential
     * for account lifecycle management and security enforcement.
     */
    account_status: string;

    /**
     * ISO 8601 timestamp indicating when this administrator account was
     * created in the platform. This represents the system's record of when
     * the administrative account was established.
     *
     * This timestamp is immutable and used for historical audit trails and
     * administrative record-keeping.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * ISO 8601 timestamp indicating the most recent modification to this
     * administrator account. This timestamp is updated whenever the
     * administrator's email, password, or account status changes, enabling
     * audit trail tracking of account modifications.
     *
     * This field is essential for compliance auditing and tracking when
     * administrative accounts were last modified, particularly for
     * security-sensitive changes.
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Email change request containing the new email address to verify and set
   * as the administrator's primary email.
   *
   * This DTO is used to initiate an email address change workflow for
   * platform administrators. The administrator must provide a valid, unique
   * email address that will receive a verification token.
   *
   * The new email must not already be in use by another administrator
   * account. Upon successful validation, the system generates a
   * cryptographically random verification token with a 24-hour expiration
   * window and sends it to the new email address.
   *
   * The administrator's current email remains active until the new email is
   * verified through the confirmation endpoint, ensuring no disruption to
   * account access during the change process.
   *
   * Security considerations include rate limiting to prevent email
   * enumeration attacks and logging of failed verification attempts for audit
   * purposes.
   */
  export type IEmailChangeRequest = {
    /**
     * The new email address to change to. Must be in valid RFC 5322 format
     * and must not already be registered with another administrator account
     * (case-insensitive check). The new email address will be placed in a
     * pending state until verified through the confirmation endpoint.
     */
    new_email: string & tags.Format<"email">;
  };

  /**
   * Confirmation response after email change request submission.
   *
   * This DTO is returned when an administrator successfully requests an email
   * address change. It confirms that the request was accepted and a
   * verification email has been sent to the new email address.
   *
   * The response includes a message confirming the action and the time window
   * (in seconds) during which the administrator can verify the new email
   * address. Once this time window expires, the verification token becomes
   * invalid and the administrator must submit a new email change request.
   *
   * The administrator should check their new email address for a verification
   * link. By clicking this link or using the verification token, they can
   * complete the email change process through the confirmation endpoint (POST
   * /auth/administrator/email-change/confirm).
   */
  export type IEmailChangeRequestResponse = {
    /**
     * Confirmation message indicating the email change request was
     * accepted. Typically states that a verification email has been sent to
     * the new email address.
     */
    message: string;

    /**
     * Time in seconds until the verification token expires. Typically 86400
     * seconds (24 hours). Indicates how long the administrator has to
     * verify the new email address before the token becomes invalid.
     */
    verification_token_expires_in: number &
      tags.Type<"int32"> &
      tags.Minimum<0>;
  };

  /**
   * Request body for confirming an email address change for a platform
   * administrator. Contains the verification token that validates the
   * administrator has access to their new email address.
   *
   * The verification token serves as proof that the administrator requested
   * the email change and has access to the new email account. The token is
   * single-use and expires 24 hours after issuance to prevent token reuse and
   * limit the window for email hijacking attacks.
   *
   * This operation is part of the email change workflow: first POST
   * /auth/administrator/email-change/request initiates the change and sends a
   * verification token to the new email, then this operation confirms the
   * change using the token.
   */
  export type IEmailChangeConfirm = {
    /**
     * Email change verification token received in the confirmation email.
     * This token was generated when the email change request was initiated
     * and contains cryptographic validation data. The token must be valid,
     * unexpired (within 24 hours), and single-use (not previously consumed
     * for confirmation).
     */
    token: string;
  };

  /**
   * Response body confirming successful completion of the email address
   * change for a platform administrator. Contains confirmation status, the
   * newly updated email address, and a user-friendly message describing the
   * outcome.
   *
   * When the email change confirmation is successful, the administrator's
   * email address in the community_platform_administrators table is
   * permanently updated and immediately becomes active. The administrator can
   * use this new email address for future authentication and password
   * recovery.
   *
   * Notification emails are sent to both the old and new email addresses to
   * inform the administrator of the change and provide security awareness.
   * The previous email address is released and can be registered by other
   * users or administrators if needed. Failed confirmation attempts return
   * appropriate error information to guide the administrator toward
   * resolution.
   */
  export type IEmailChangeConfirmResponse = {
    /**
     * Indicates whether the email address change confirmation was
     * successful. True indicates the email has been permanently updated and
     * is now active on the administrator account.
     */
    success: boolean;

    /**
     * The newly confirmed email address now associated with the
     * administrator account. This email address replaces the previous email
     * and becomes the primary contact method for this administrator.
     */
    email: string & tags.Format<"email">;

    /**
     * Confirmation message describing the outcome of the email change
     * operation. Provides user-friendly feedback about successful
     * completion, token validation, or error conditions.
     */
    message: string;
  };
}
