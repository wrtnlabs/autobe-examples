import { tags } from "typia";

export namespace IModerator {
  /**
   * Request body for moderator account registration containing the email and
   * plaintext password provided by the user during signup.
   *
   * The 'email' field is the primary identifier for moderator registration
   * and must be unique across the system. The 'password' field accepts the
   * plaintext password provided by the user during registration; the backend
   * will hash this value using bcrypt and store it in the 'passwordHash'
   * column of the moderator table.
   *
   * This schema does NOT include system-generated fields like 'id' or
   * 'createdAt' as they are handled automatically by the backend. The schema
   * does NOT include any authentication context fields (e.g., 'creator_id',
   * 'email_verified') as these are derived from the JWT session or system
   * processes, not user input.
   *
   * This design conforms to the security-first principle: no actor
   * identifiers are accepted from the client. The moderator identity is
   * derived from the authenticated session context, not request body. Any
   * field related to session state, system auditing, or user verification
   * status is excluded from this request body.
   *
   * Note: If the 'moderator' Prisma model contained a 'phoneNumber' or
   * 'twoFactorSecret' field, they would not be included here either—this
   * registration flow is designed around email/password only, as specified in
   * the system constraints.
   */
  export type ICreate = string;

  /**
   * Request body containing the moderator's email and plaintext password for
   * credential validation.
   *
   * This schema is used exclusively for the login operation, where a
   * moderator presents their email and password to obtain an authentication
   * token. The 'email' field is the unique identifier for moderator accounts.
   * The 'password' field contains the plaintext password entered by the
   * user—the system securely hashes it against the stored value in
   * 'passwordHash' for verification.
   *
   * Authentication fields are never included in the request body: the
   * authenticated moderator's identity is extracted from the JWT token in
   * authenticated endpoints, not provided in the request. This schema does
   * not include any system-managed fields such as 'lastLoginAt', 'isActive',
   * or 'isVerified'—those are determined by the backend service based on the
   * Prisma schema state.
   *
   * Security consideration: The schema is carefully constructed to avoid
   * sensitive fields like 'refreshToken', 'accessToken', or
   * 'twoFactorSecret', which are stored server-side only. This endpoint is
   * open to unauthenticated requests, so no client-originated identity or
   * session context is accepted.
   *
   * The absence of 'emailVerified' or 'twoFactorEnabled' from this schema
   * confirms that email verification and MFA are handled asynchronously via
   * platform workflows, not during the login process.
   */
  export type IAuth = {
    /**
     * The email address of the moderator attempting to authenticate. This
     * field is required for login and must correspond to a registered
     * moderator account in the system.
     */
    email: string & tags.Format<"email">;

    /**
     * The plaintext password provided by the moderator for authentication.
     * The system securely hashes this value against the stored passwordHash
     * in the moderator table using bcrypt.
     */
    password: string;
  };

  /**
   * The refresh token provided by the client for validation and access token
   * renewal. This token must be valid and not expired, and it must be bound
   * to a specific moderator ID in the external session storage.
   *
   * The refresh token is initially issued during the login or join operation
   * and stored securely in an external session store (e.g., Redis). It is not
   * stored in the moderator table due to its lifecycle and security
   * requirements. This field is a cryptographically signed token containing
   * the moderator ID and expiration information.
   *
   * The token format is a secure, opaque string that cannot be decoded by the
   * client. It is bound to the moderator ID via the session store, and its
   * validity is checked against the external storage during refresh
   * requests.
   *
   * This field is required for the operation to succeed, as it's the primary
   * mechanism for verifying the client's authenticated session without
   * requiring credentials.
   */
  export type IRefresh = string;
}
