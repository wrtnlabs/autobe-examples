import { tags } from "typia";

export namespace IShoppingMallCustomerAuth {
  /**
   * Request body schema for a customer self-registration (join) operation on
   * the shoppingMall platform.
   *
   * This DTO is used when a new customer signs up themselves and should
   * include both identity credentials and session context fields so that the
   * platform can create authentication credentials, the customer profile, and
   * an initial session/audit trail. The server will create related records in
   * shopping_mall_customer, shopping_mall_auth_credentials, and
   * shopping_mall_auth_credentials_of_customers, plus optional auth log and
   * security event rows.
   */
  export type IJoin = {
    /**
     * Customer email address used both as the login identifier and the
     * primary email in shopping_mall_customer. Must be unique among
     * customers and among auth credentials with actor_type = "customer".
     */
    email: string & tags.Format<"email">;

    /**
     * Plain-text password chosen by the customer. The backend hashes this
     * value and stores it in shopping_mall_auth_credentials.password_hash.
     * Clients must never send pre-hashed passwords.
     */
    password: string;

    /**
     * Display name of the customer stored in shopping_mall_customer.name.
     * Shown in customer-facing UIs and communications.
     */
    name: string;

    /**
     * Client IP address for session tracking and security analytics.
     * Optional: when null, the server may infer the IP from the transport
     * context.
     */
    ip?: string | null | undefined;

    /**
     * Full URL of the page where the registration request was initiated.
     * Used to populate shopping_mall_customer_sessions.href for audit and
     * security analysis.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL of the page that led to the registration request. Stored
     * in shopping_mall_customer_sessions.referrer for auditability and
     * fraud analysis.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Login credentials and session context for an existing shopping mall
   * customer.
   *
   * Used when a customer signs into the shopping mall platform using email
   * and password. Also carries connection metadata needed to create an
   * authentication session record such as IP, current URL, referrer URL, and
   * User-Agent information for security analytics and audit logs.
   */
  export type ILogin = {
    /**
     * Customer email address used as the login identifier.
     *
     * Must match the email stored in shopping_mall_auth_credentials for
     * actor_type "customer" so that the backend can look up the correct
     * credentials row and associated customer account.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password provided by the customer for authentication.
     *
     * The backend hashes this value using the configured password hashing
     * algorithm and compares the result against the stored password_hash in
     * shopping_mall_auth_credentials. The raw password value is never
     * persisted.
     */
    password: string;

    /**
     * Optional client IP address for session tracking and security
     * analytics.
     *
     * If omitted or set to null, the server derives the effective client IP
     * from the HTTP connection metadata and still persists it into session
     * and security logging tables.
     */
    ip?: string | null | undefined;

    /**
     * Absolute URL of the page where the login was initiated.
     *
     * Captured and persisted into shopping_mall_customer_sessions and
     * possibly shopping_mall_security_events so that operators can
     * understand the navigation context in which the login occurred.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL from which the customer navigated to the login page.
     *
     * Stored in session and security event records for analytics, fraud
     * detection, and understanding customer navigation flows leading up to
     * authentication.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Optional HTTP User-Agent string supplied by the client during the
     * login request.
     *
     * When present, this value is written into shopping_mall_auth_logs and
     * shopping_mall_security_events (for example as user_agent) to describe
     * the device, browser, and runtime environment used during the
     * authentication attempt. If omitted, the backend may derive the
     * User-Agent directly from the HTTP request headers instead of this
     * field.
     */
    userAgent?: string | undefined;
  };

  /**
   * Refresh token payload used to renew an authenticated customer session.
   *
   * The client sends a previously issued refresh token so that the backend
   * can validate it, check underlying credential and customer state, and
   * issue new JWT tokens for the customer. Optional client context such as
   * the User-Agent string can also be provided for richer logging and
   * security analytics on refresh events.
   */
  export type IRefresh = {
    /**
     * Refresh token previously issued to the authenticated customer.
     *
     * The backend validates this token according to platform rules
     * (signature verification, expiry checks, rotation policies) and uses
     * its claims to resolve the underlying shopping_mall_auth_credentials
     * and shopping_mall_customer records before issuing new JWT access and
     * refresh tokens.
     */
    refreshToken: string;

    /**
     * Optional HTTP User-Agent string describing the client environment at
     * the time of the refresh request.
     *
     * When provided, this value can be recorded into
     * shopping_mall_auth_logs and shopping_mall_security_events for
     * TOKEN_REFRESH events, helping security and analytics teams understand
     * which devices and runtimes are performing token refresh operations.
     * If omitted, the backend may use the User-Agent from the HTTP request
     * headers instead of this field.
     */
    userAgent?: string | undefined;
  };

  /**
   * Request payload for verifying a customer’s email address using an opaque
   * verification token that was previously issued and stored in
   * shopping_mall_email_verification_tokens.
   *
   * The client submits only the token that was delivered out of band
   * (typically via email). The backend uses this token to locate the
   * corresponding verification record, validate expiry and consumption state,
   * and then mark the associated customer’s email as verified while updating
   * related authentication records. No actor IDs or session identifiers are
   * included here; those are derived server-side from the token and
   * authentication context.
   */
  export type IVerifyEmail = {
    /**
     * Opaque email verification token previously issued to the customer and
     * stored in shopping_mall_email_verification_tokens.token.
     *
     * This value is treated as a secure random string with no
     * client-visible structure. It is used by the backend to look up the
     * verification record, confirm that it has not expired or been
     * consumed, and resolve the associated auth credentials and customer
     * identity.
     */
    token: string;
  };

  /**
   * Request payload for initiating a customer password reset workflow.
   *
   * The client provides the customer’s login email address, and the backend
   * creates a corresponding password reset token in
   * shopping_mall_password_reset_tokens when an eligible credentials record
   * exists. The endpoint always returns a generic acknowledgement regardless
   * of whether the email is registered, preventing account enumeration. No
   * authentication context or actor IDs are supplied in this DTO.
   */
  export type IRequestPasswordReset = {
    /**
     * Customer login email address used to locate the corresponding
     * shopping_mall_auth_credentials row with actor_type = "customer".
     *
     * The backend uses this email to determine whether a password reset
     * token can be issued. The response is intentionally generic so callers
     * cannot infer whether an account exists for this email.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Generic acknowledgement response returned after a customer password reset
   * request has been processed.
   *
   * This DTO intentionally does not reveal whether the email belongs to an
   * existing account. It only indicates that the request has been accepted
   * and, optionally, includes simple hints about follow-up actions such as
   * checking the inbox. It must never expose any security‑sensitive details
   * or account existence information.
   */
  export type IRequestPasswordResetResult = {
    /**
     * High‑level status of the password reset request handling.
     *
     * Must always be a generic, non‑revealing value that does not indicate
     * whether the email address is registered. Typical values are
     * "accepted" or "processed" to indicate that the request has been
     * handled by the system.
     */
    status: "accepted" | "processed";

    /**
     * Human‑readable message describing that the password reset request has
     * been accepted and that, if an account exists, the platform may send
     * further instructions via email.
     *
     * This message must be phrased in a way that does not confirm whether
     * the email is associated with any account.
     */
    message?: string | undefined;
  };

  /**
   * Password reset completion payload for customer accounts.
   *
   * This DTO is used when the customer completes a password reset flow using
   * a previously issued reset token. It carries the opaque reset token value
   * and the new password the customer wishes to set.
   *
   * The server validates the token against
   * shopping_mall_password_reset_tokens (including expiry and consumed
   * status), resolves the owning shopping_mall_auth_credentials row, verifies
   * that actor_type="customer" and that the credentials are in a modifiable
   * state, and then updates the stored password hash.
   *
   * The DTO must never include any credential or actor identifiers such as
   * auth_credentials_id, customer_id, or email; those are resolved on the
   * server side from the token and database relations. The password field
   * contains the plain text password which will be securely hashed on the
   * backend before being stored in the password_hash column.
   */
  export type IResetPassword = {
    /**
     * Opaque password reset token previously issued and stored in
     * shopping_mall_password_reset_tokens.token.
     *
     * This value is treated as an unguessable secret and is used by the
     * server to look up and validate the corresponding password reset
     * record. It must not be guessable or derivable from public
     * information.
     */
    token: string;

    /**
     * New plain text password that the customer wishes to set.
     *
     * The server hashes this value and stores it into
     * shopping_mall_auth_credentials.password_hash. Clients must not send
     * pre‑hashed passwords. Server‑side validation should enforce password
     * strength rules such as minimum length and complexity, but those rules
     * are not encoded directly in this schema.
     */
    password: string;
  };

  /**
   * Request body payload for an authenticated customer password change
   * operation.
   *
   * This DTO is used when a logged-in shopping mall customer wants to update
   * their password by providing the current password and a new desired
   * password. The backend validates the current password against the stored
   * hash and, if valid, replaces it with a hash of the new password and
   * records appropriate authentication and security events.
   */
  export type IChangePassword = {
    /**
     * Current password of the authenticated customer. This value is
     * provided in plain text by the client solely for verification against
     * the stored password hash.
     *
     * The backend hashes this value and compares it with the password_hash
     * stored in shopping_mall_auth_credentials for the customer actor. It
     * is never stored directly.
     */
    currentPassword: string;

    /**
     * New password the customer wants to set for their account. Provided in
     * plain text by the client.
     *
     * The backend hashes this value and persists the hash into
     * shopping_mall_auth_credentials.password_hash for the corresponding
     * customer credentials row. The plaintext value must not be stored.
     */
    newPassword: string;
  };
}
