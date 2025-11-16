export namespace IGuest {
  /**
   * Request schema for guest registration transition to member account.
   *
   * This request schema defines the data required to convert an anonymous
   * guest profile into a registered member account on the CommunityPlatform.
   * The schema corresponds directly to the guest table in the Prisma schema,
   * but with critical security enhancements.
   *
   * The guest-to-member conversion is the primary business mechanism for user
   * acquisition on the platform. This schema enables the workflow where
   * temporary visitors can become permanent community participants by
   * providing a valid email address and a plain text password.
   *
   * Security considerations are embedded in the design:
   *
   * - Uses 'password' field (plain text) instead of 'password_hash' field to
   *   ensure backend controls password hashing
   * - Requires session context fields (ip, href, referrer) to create secure
   *   session records in guest_sessions table
   * - Follows zero-trust principle by not accepting any authentication context
   *   from client
   *
   * This schema specifically implements the 'self-authentication' pattern
   * where the actor is registering themselves (authorizationActor: 'guest'
   * for the operation, but effectively transitioning to 'member' context).
   * The password is securely hashed server-side and stored in the
   * password_hashed field of the guest table.
   *
   * The data provided through this schema directly maps to fields in the
   * guest table: email as the primary identifier and the server-processed
   * hashed password as the authentication credential. The backend systems use
   * these fields to create the corresponding member record in the member
   * table once registration is successfully completed.
   *
   * The session context fields (ip, href, referrer) are persisted in the
   * guest_sessions table to enable detailed audit trails and security
   * monitoring.
   */
  export type ICreate = {
    /**
     * User's email address used for account registration and communication.
     * Must be unique across the platform and follow standard email format.
     * This field is required to establish a persistent identity for the
     * guest-to-member conversion process. The email is stored as a key
     * identifier in the guest table schema and will be used to create the
     * corresponding member account in the member table after successful
     * registration.
     *
     * The email field is critical to the business requirement that enables
     * users to transition from temporary guest browsing to authenticated
     * member status. Without this field being present in the guest table,
     * the registration functionality described in the business requirements
     * cannot be implemented.
     *
     * This field must not use personal email domains like gmail.com or
     * yahoo.com according to business context; however, the schema does not
     * specify domain restrictions so we must rely on the field's definition
     * as a basic email format.
     *
     * The guest table contains this field as a required attribute, which
     * validates that guest registration requires email specification.
     */
    email: string;

    /**
     * User's plain text password for registration. The backend will hash
     * this password using a secure algorithm (bcrypt) and store the result
     * in the password_hashed field of the database. This follows the
     * principle of field name mapping: the DTO uses user-friendly field
     * names (password) while the database uses internal storage names
     * (password_hashed).
     *
     * Client applications should NEVER send pre-hashed passwords. Only
     * plain text passwords are accepted to ensure the backend maintains
     * control over security algorithms, salt generation, and password
     * strength validation.
     *
     * This field is required for the guest-to-member conversion process.
     * The plaintext password is processed server-side using the platform's
     * secure hashing mechanism, and the resulting hash is stored in the
     * password_hashed column of the guest table. This ensures passwords are
     * never stored in plain text in the database, maintaining security
     * compliance with business requirements.
     *
     * This field is critical for implementing proper password security
     * practices. By using 'password' in the DTO instead of
     * 'password_hashed', we separate the API contract from internal
     * database implementation details.
     */
    password: string;

    /**
     * Client's IP address for session audit trail. This field is OPTIONAL
     * and client may optionally provide their IP address for SSR contexts.
     *
     * When provided, the value MUST be a valid IPv4 or IPv6 address. If not
     * provided, the server will extract the IP address from the HTTP
     * request headers (X-Forwarded-For, Remote-Addr). The server's IP
     * extraction logic will always provide a reliable value regardless of
     * whether the client provides this field, so it's optional.
     *
     * This field is part of the session context metadata required for
     * creating a session record in the guest_sessions table when the guest
     * transitions to a member account.
     */
    ip?: string | undefined;

    /**
     * Connection URL (current page URL) that the client is accessing during
     * registration.
     *
     * This field is MANDATORY for self-authentication operations. The href
     * value enables the system to record the user's entry point into the
     * registration flow, which is essential for:
     *
     * - Session context tracking
     * - Security analytics
     * - Detecting potential attack patterns (e.g., bot-based registration
     *   attempts)
     * - Compliance with audit requirements
     *
     * This field cannot be computed by the server because it represents the
     * specific page URL from which the user initiated registration.
     */
    href: string;

    /**
     * Referrer URL (previous page URL) that led the user to the
     * registration page.
     *
     * This field is MANDATORY for self-authentication operations. The
     * referrer value enables the system to record the origin of the
     * registration traffic, which is essential for:
     *
     * - Marketing attribution and analytics
     * - Security monitoring (identifying phishing or malicious referral
     *   sources)
     * - UX optimization (understanding user pathways)
     * - Compliance with audit requirements
     *
     * This field cannot be computed by the server because it represents the
     * specific page from which the user navigated to the registration
     * flow.
     */
    referrer: string;
  };

  /**
   * Request object for guest token refresh operation. Contains the refresh
   * token stored in guest_sessions table.
   *
   * This DTO is used specifically for the /auth/guest/refresh endpoint, which
   * allows registered guest users to renew their authentication tokens.
   *
   * The refresh token must be a valid, non-expired token that exists in the
   * guest_sessions database table.
   *
   * The platform's security model requires this token to be presented with
   * every refresh request to validate the user's session before issuing new
   * tokens.
   *
   * This request object includes connection metadata (ip, href, referrer)
   * required for session creation in the guest_sessions table, as documented
   * in 04-user-journey.md.
   *
   * The metadata fields are not authentication context fields (they do not
   * identify users) but are required connection details for audit trail and
   * security monitoring.
   *
   * The token format follows the JWT standards and must be generated by the
   * platform's auth service during initial guest registration.
   *
   * This DTO represents the minimal required information for a token refresh
   * operation: the refresh token itself and mandatory session context
   * metadata.
   *
   * The platform's security policy explicitly forbids including any
   * additional fields in this request for security reasons, preventing
   * potential attacks through parameter tampering.
   *
   * The fields are:
   *
   * - Token: JWT refresh token as stored in guest_sessions
   * - Ip: OPTIONAL client IP address (can be extracted by server, but client
   *   may provide for SSR cases)
   * - Href: MANDATORY connection URL (current page)
   * - Referrer: MANDATORY referrer URL (previous page)
   *
   * All fields are required for proper session creation as per
   * 05-business-rules.md and 04-user-journey.md.
   */
  export type IRequest = string;
}
