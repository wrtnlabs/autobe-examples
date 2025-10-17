import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { IEAuthMfaMethod } from "./IEAuthMfaMethod";

export namespace IEconDiscussAdmin {
  /**
   * Admin registration payload.
   *
   * Creates a base identity in Actors.econ_discuss_users with the provided
   * credentials and preferences. Role assignment to
   * Actors.econ_discuss_admins (including superuser/enforced_2fa) is handled
   * by service logic; those flags are not part of this public request to
   * avoid privilege escalation via client input.
   *
   * Security notes: Never accept password_hash from clients; accept plaintext
   * only and hash server‑side. Initialize email_verified=false and
   * mfa_enabled=false on creation per policy; MFA secrets/codes are
   * configured via dedicated endpoints.
   */
  export type ICreate = {
    /**
     * Admin account email (unique) to persist into
     * econ_discuss_users.email.
     *
     * Prisma reference: Actors.econ_discuss_users.email — Uniqueness
     * enforced by @@unique([email]).
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password. The server hashes this into
     * econ_discuss_users.password_hash; plaintext is never stored.
     *
     * Prisma reference: Actors.econ_discuss_users.password_hash — Secure
     * hash storage only.
     */
    password: string & tags.MinLength<8>;

    /**
     * Public display name/handle stored in econ_discuss_users.display_name.
     *
     * Prisma reference: Actors.econ_discuss_users.display_name — Required
     * for identity surfaces.
     */
    display_name: string & tags.MinLength<1>;

    /**
     * Optional IANA timezone identifier mapped to
     * econ_discuss_users.timezone. Example: "Asia/Seoul".
     *
     * Prisma reference: Actors.econ_discuss_users.timezone — Used for
     * digests and scheduling.
     */
    timezone?: string | null | undefined;

    /**
     * Optional BCP‑47 locale tag mapped to econ_discuss_users.locale.
     * Example: "en-US".
     *
     * Prisma reference: Actors.econ_discuss_users.locale — UI language
     * preference.
     */
    locale?: string | null | undefined;

    /**
     * Optional avatar image URI stored in econ_discuss_users.avatar_uri.
     *
     * Prisma reference: Actors.econ_discuss_users.avatar_uri — Nullable
     * VarChar; URI format recommended at the application layer.
     */
    avatar_uri?: (string & tags.Format<"uri">) | null | undefined;
  };

  /**
   * Authorization response for administrator flows (join/login/refresh).
   *
   * On success, returns core subject id and a standard JWT token set.
   * Optional fields provide role context and a subject projection. Prisma
   * tables referenced: econ_discuss_users (id, display_name, avatar_uri,
   * timezone, locale, email_verified, mfa_enabled) and econ_discuss_admins
   * (role assignment and policy flags, not exposed directly).
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated administrator, taken from
     * Actors.econ_discuss_users.id.
     *
     * Security: never expose password_hash, mfa_secret, or
     * mfa_recovery_codes. This id links the authorization result to the
     * econ_discuss_users row as documented in the Prisma schema comments.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Fixed role claim for this authorization context.
     *
     * Presence indicates administrator scope confirmed by a linked row in
     * Actors.econ_discuss_admins for the same user_id.
     */
    role?: "admin" | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Administrator subject profile assembled from
     * Actors.econ_discuss_users (identity and preferences) and role
     * presence in Actors.econ_discuss_admins.
     *
     * Sensitive authentication fields are intentionally omitted.
     */
    admin?: IEconDiscussAdmin.ISubject | undefined;
  };

  /**
   * Administrator subject projection based on Actors.econ_discuss_users.
   *
   * Contains identity and preference fields suitable for client-side session
   * context while omitting confidential authentication columns described in
   * the Prisma schema (password_hash, mfa_secret, mfa_recovery_codes).
   */
  export type ISubject = {
    /** Administrator’s user id from Actors.econ_discuss_users.id. */
    id: string & tags.Format<"uuid">;

    /**
     * Public display name/handle from
     * Actors.econ_discuss_users.display_name.
     *
     * Used for identification in admin consoles and audit views.
     */
    displayName: string;

    /**
     * Optional avatar image URI from Actors.econ_discuss_users.avatar_uri.
     *
     * Application should validate URI format; may be null when not
     * configured.
     */
    avatarUri?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Preferred IANA timezone from Actors.econ_discuss_users.timezone
     * (e.g., Asia/Seoul).
     *
     * Used for scheduling and timestamp presentation; nullable when
     * unspecified.
     */
    timezone?: string | null | undefined;

    /**
     * Preferred locale (e.g., en-US) from Actors.econ_discuss_users.locale.
     *
     * Impacts UI and notification localization; nullable when not set.
     */
    locale?: string | null | undefined;

    /**
     * Email verification flag from
     * Actors.econ_discuss_users.email_verified.
     *
     * Certain administrative actions may be gated until verified.
     */
    emailVerified: boolean;

    /**
     * Multi-factor authentication enabled flag from
     * Actors.econ_discuss_users.mfa_enabled.
     *
     * Underlying mfa_secret and mfa_recovery_codes remain confidential and
     * are never exposed.
     */
    mfaEnabled: boolean;

    /**
     * Record creation timestamp from Actors.econ_discuss_users.created_at.
     *
     * Provided for audit display and client-side freshness.
     */
    createdAt?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Record last update timestamp from
     * Actors.econ_discuss_users.updated_at.
     *
     * Updated when profile or security-relevant settings change.
     */
    updatedAt?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Admin login request payload.
   *
   * Validates credentials against Actors.econ_discuss_users
   * (email/password_hash) and confirms administrator scope via
   * Actors.econ_discuss_admins. Supports optional MFA with mfaCode when
   * enforced.
   */
  export type ILogin = {
    /**
     * Administrator account email for authentication
     * (Actors.econ_discuss_users.email).
     *
     * Uniqueness is enforced by @@unique([email]) in the Prisma schema.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password to be verified against
     * Actors.econ_discuss_users.password_hash.
     *
     * The server hashes the password and compares; plaintext is never
     * persisted.
     */
    password: string;

    /**
     * Optional one-time code for MFA verification when required by policy.
     *
     * When econ_discuss_admins.enforced_2fa is true and/or
     * econ_discuss_users.mfa_enabled is true, provide a TOTP or recovery
     * code. Null when not used.
     */
    mfaCode?: string | null | undefined;
  };

  /**
   * Admin token refresh request carrying only the refresh token.
   *
   * No direct user identifiers are supplied; identity and role are inferred
   * from the validated token.
   */
  export type IRefresh = {
    /**
     * Opaque refresh token presented for rotation and access token renewal.
     *
     * The server derives identity from token claims and revalidates admin
     * role via Actors.econ_discuss_admins.
     */
    refreshToken: string;
  };

  /**
   * Resend administrator email verification request.
   *
   * Triggers mailer flows to deliver a fresh verification link without
   * revealing account existence.
   */
  export type IEmailResendRequest = {
    /**
     * Target administrator email address (Actors.econ_discuss_users.email)
     * to resend a verification message.
     *
     * Responses should be neutral to avoid user enumeration.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Security operation acknowledgement for administrator-focused
   * authentication flows.
   *
   * This DTO is returned by endpoints that do not yield domain entities but
   * confirm that a security-sensitive action has been accepted or completed
   * (e.g., email verification dispatch, password reset
   * initiation/confirmation, password change). It intentionally carries no
   * secrets and no database identifiers.
   *
   * Business context: the underlying identity comes from the Actors schema
   * (Prisma) using econ_discuss_users for account state
   * (email/email_verified, mfa_enabled) and econ_discuss_admins for role
   * assignment (superuser, enforced_2fa). This response does not expose
   * columns such as password_hash, mfa_secret, or mfa_recovery_codes; it
   * merely reports the outcome and a timestamp suitable for client UX and
   * audit trails.
   */
  export type ISecurityEvent = {
    /**
     * Human-readable outcome keyword describing the security action result.
     *
     * Typical values include: "queued" (e.g., email resend), "sent"
     * (message dispatched), "verified" (email or MFA confirmed), "updated"
     * (password changed), or "completed" (flow finished). The exact
     * vocabulary is implementation-defined and may vary by endpoint.
     */
    outcome: string;

    /**
     * Optional descriptive message suitable for UI display. Does not
     * contain secrets or internal identifiers.
     *
     * Example: "Verification email sent. Please check your inbox."
     */
    message?: string | undefined;

    /**
     * Server-side timestamp (ISO 8601, UTC) when the system
     * accepted/completed the security action.
     *
     * This is not a database column; it is derived from the operation time
     * and is useful for client-side logging and user feedback.
     */
    occurred_at: string & tags.Format<"date-time">;

    /**
     * Optional request correlation identifier useful for client support and
     * auditing.
     *
     * This value can correlate app/server logs and may originate from
     * tracing middleware or API gateway. It is not a Prisma primary key and
     * must not reveal internal infrastructure details.
     */
    request_id?: string | undefined;
  };

  /**
   * Email verification confirmation payload for administrator accounts.
   *
   * This request body contains the opaque verification token delivered
   * out-of-band (e.g., email link). On successful verification, the service
   * updates Actors.econ_discuss_users.email_verified to true and touches
   * updated_at per Prisma schema. It does not include or expose any sensitive
   * authentication material.
   *
   * Relevant Prisma columns referenced by the workflow:
   *
   * - Econ_discuss_users.email_verified (Boolean)
   * - Econ_discuss_users.updated_at (timestamp)
   *
   * No other columns are modified by this request itself; tokens are
   * validated at the service layer.
   */
  export type IEmailVerifyRequest = {
    /**
     * Opaque verification token proving ownership of
     * econ_discuss_users.email.
     *
     * Supplied via a secure email link; format is implementation-defined
     * (e.g., JWT or random hash).
     */
    token: string;
  };

  /**
   * Change-password request for an authenticated administrator.
   *
   * The service validates the current credential against
   * Actors.econ_discuss_users.password_hash and, on success, replaces it with
   * a new hash derived from new_password and updates
   * econ_discuss_users.updated_at. The request must never transmit or receive
   * password hashes; only plaintext inputs are accepted over a secure channel
   * (TLS) and hashed server-side.
   *
   * Prisma columns involved (referenced by service logic):
   *
   * - Econ_discuss_users.password_hash (String) — updated by this operation
   * - Econ_discuss_users.updated_at (timestamp) — touched on success
   *
   * If 2FA is enforced (see Actors.econ_discuss_admins.enforced_2fa and
   * econ_discuss_users.mfa_enabled), the service may require additional
   * second‑factor validation outside this DTO.
   */
  export type IChangePassword = {
    /**
     * Current account password in plaintext for verification against
     * econ_discuss_users.password_hash.
     *
     * Must be provided by the authenticated administrator. Never logged or
     * stored as plaintext.
     */
    current_password: string;

    /**
     * New account password in plaintext.
     *
     * Server hashes it to replace econ_discuss_users.password_hash. Apply
     * your platform’s password policy (length, complexity, breach checks)
     * at validation time.
     */
    new_password: string;
  };

  /**
   * Initiate a password reset for an administrator account by email.
   *
   * This request starts an out-of-band flow: the service locates the user by
   * econ_discuss_users.email (if present), creates a time-limited reset token
   * (not modeled in Prisma), and dispatches an email. To avoid account
   * enumeration, responses must be generic regardless of account existence.
   *
   * Prisma columns referenced by service logic (read-only at this step):
   *
   * - Econ_discuss_users.email (unique)
   * - Econ_discuss_users.email_verified (may influence messaging)
   *
   * No columns are modified in this step; password_hash is only updated by
   * the separate reset-confirm endpoint.
   */
  export type IPasswordResetRequest = {
    /**
     * Email address of the account requesting a password reset.
     *
     * Must be a valid email; uniqueness is enforced in Prisma at
     * econ_discuss_users.email, but the API should not disclose whether the
     * address exists.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Confirm administrator password reset.
   *
   * On success, the service updates Actors.econ_discuss_users.password_hash
   * and touches updated_at. Sensitive MFA fields (mfa_secret,
   * mfa_recovery_codes) are not modified by this operation. This DTO
   * corresponds to the confirm step described in the admin password reset
   * flow and maps to the Prisma table columns documented in the Actors
   * namespace.
   */
  export type IPasswordResetConfirm = {
    /**
     * Password reset token delivered out-of-band (e.g., via email link).
     *
     * This token identifies the target account in Actors.econ_discuss_users
     * for which the credential update will occur. The token is validated
     * server-side; the client only passes it back unchanged.
     */
    token: string;

    /**
     * New plaintext password to set for the account. The backend hashes
     * this value into Actors.econ_discuss_users.password_hash.
     *
     * Security notes:
     *
     * - Never log this field.
     * - Transport must be HTTPS.
     * - Strong password policy should be enforced by the provider.
     */
    new_password: string & tags.MinLength<8> & tags.Format<"password">;
  };

  /**
   * Request to begin MFA enrollment for an administrator account.
   *
   * When method=totp, the server generates and stores an encrypted secret in
   * Actors.econ_discuss_users.mfa_secret and prepares recovery codes in
   * Actors.econ_discuss_users.mfa_recovery_codes. It returns provisioning
   * information in the corresponding response. MFA is not enabled until
   * verification completes (mfa_enabled remains false).
   */
  export type IMfaSetupRequest = {
    /**
     * MFA method to enroll.
     *
     * In the current system, TOTP is supported and requires provisioning a
     * secret in Actors.econ_discuss_users.mfa_secret.
     */
    method: IEAuthMfaMethod;
  };

  /**
   * Provisioning details returned when starting MFA setup for administrators.
   *
   * This DTO conveys client bootstrap data for TOTP enrollment while keeping
   * secrets confidential. The underlying artifacts are persisted in
   * Actors.econ_discuss_users (mfa_secret, mfa_recovery_codes) but MFA is
   * only activated after successful verification (mfa_enabled=true).
   */
  export type IMfaSetup = {
    /** Enrolled MFA method for which provisioning data is being returned. */
    method: IEAuthMfaMethod;

    /**
     * Otpauth:// provisioning URI suitable for TOTP authenticators (e.g.,
     * authenticator apps).
     *
     * This value encodes issuer/account metadata and the generated secret
     * (never display or log after initial delivery).
     */
    provisioning_uri: string & tags.Format<"uri">;

    /**
     * Masked representation of the shared secret for human copy if clients
     * do not use a QR flow.
     *
     * Do not expose full raw secret in logs or subsequent reads. Present
     * only during setup and preferably masked (e.g., show last 4
     * characters).
     */
    secret_masked?: string | undefined;
  };

  /**
   * Verify MFA enrollment for an administrator using either a TOTP code or a
   * recovery code.
   *
   * On success, the backend sets Actors.econ_discuss_users.mfa_enabled=true
   * and updates updated_at. Provide exactly one of the fields (code or
   * recovery_code).
   */
  export type IMfaVerifyRequest = any | any;

  /**
   * Disable administrator multi-factor authentication (MFA) by submitting
   * either a current TOTP code or a recovery code.
   *
   * On success, the server sets Actors.econ_discuss_users.mfa_enabled=false
   * and rotates/clears mfa_secret and mfa_recovery_codes per policy, updating
   * updated_at.
   */
  export type IMfaDisableRequest = any | any;

  /**
   * Admin request to regenerate MFA recovery codes.
   *
   * This payload proves possession of the enrolled second factor using a
   * current TOTP code. Upon success, the service issues a fresh set of
   * one-time recovery codes and securely replaces
   * Actors.econ_discuss_users.mfa_recovery_codes. No database schema change
   * occurs beyond updating the stored codes and timestamps per the Prisma
   * comments.
   */
  export type IMfaRegenerateRequest = {
    /**
     * Current valid TOTP code derived from
     * Actors.econ_discuss_users.mfa_secret and used to authorize
     * regeneration of recovery codes.
     *
     * A successful submission confirms possession of the enrolled factor
     * before replacing econ_discuss_users.mfa_recovery_codes.
     */
    totpCode: string;
  };

  /**
   * Response payload containing newly generated MFA recovery codes for an
   * admin.
   *
   * This DTO is returned by endpoints that rotate
   * econ_discuss_users.mfa_recovery_codes. It intentionally contains only
   * client‑displayable data (plaintext codes and metadata). Secrets are never
   * persisted in the response beyond this one-time display, consistent with
   * the Prisma schema guidance on secure storage.
   */
  export type IMfaRecoveryCodes = {
    /**
     * Plaintext recovery codes issued to the administrator. These are
     * displayed exactly once and must be stored securely by the user.
     *
     * On the server, only hashed/encrypted forms are retained in
     * Actors.econ_discuss_users.mfa_recovery_codes. Each code is one-time
     * use.
     */
    codes: string[];

    /**
     * Number of recovery codes included in this issuance.
     *
     * Useful for clients to verify completeness of what was displayed and
     * stored by the user.
     */
    count: number & tags.Type<"int32">;

    /**
     * ISO 8601 timestamp when this set of recovery codes was generated.
     *
     * Provided for auditing UX and to help users distinguish recent vs.
     * older sets on their side (server retains only hashed/encrypted
     * codes).
     */
    generatedAt: string & tags.Format<"date-time">;
  };
}
