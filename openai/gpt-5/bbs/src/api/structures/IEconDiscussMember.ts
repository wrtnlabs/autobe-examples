import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconDiscussMember {
  /**
   * Member registration payload.
   *
   * Creates a base identity in Actors.econ_discuss_users (email,
   * password_hash from password, display_name, optional avatar_uri, timezone,
   * locale; email_verified=false; mfa_enabled=false). Then assigns a Member
   * role via Actors.econ_discuss_members (joined_at set), issuing JWTs on
   * success.
   *
   * Security: Only accept plaintext password for hashing. Do not include
   * system-managed columns like id, created_at, updated_at, or any
   * MFA/verification flags in the request.
   */
  export type ICreate = {
    /**
     * User's unique email address for authentication.
     *
     * Maps to econ_discuss_users.email in the Actors schema. Must be
     * unique.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password to be securely hashed into
     * econ_discuss_users.password_hash by the server. Never persisted or
     * logged in plaintext.
     */
    password: string & tags.MinLength<8>;

    /**
     * Publicly visible display name/handle.
     *
     * Maps to econ_discuss_users.display_name.
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<120>;

    /**
     * Preferred IANA timezone identifier (e.g., "Asia/Seoul").
     *
     * Maps to econ_discuss_users.timezone.
     */
    timezone?: string | undefined;

    /**
     * Preferred BCP 47 locale tag for UI and messaging (e.g., "en-US").
     *
     * Maps to econ_discuss_users.locale.
     */
    locale?: string | undefined;

    /**
     * Optional avatar image URI.
     *
     * Maps to econ_discuss_users.avatar_uri.
     */
    avatar_uri?: (string & tags.Format<"uri">) | undefined;
  };

  /**
   * Login request for Member role.
   *
   * This DTO transports the minimum data needed to authenticate a member
   * against the Actors schema. It references econ_discuss_users for identity
   * (email) and secure credential verification (password_hash). When
   * multi-factor authentication is enabled (mfa_enabled), clients may supply
   * mfa_code to complete the flow.
   *
   * Security notes: the password is never persisted in plaintext and must be
   * hashed server-side for comparison. No secrets (password_hash, mfa_secret,
   * recovery codes) are ever returned by the API.
   */
  export type ILogin = {
    /**
     * Member account email used for authentication.
     *
     * Maps to econ_discuss_users.email (unique). The value must be a
     * normalized email address the user controls. This field is only used
     * for credential validation and is never persisted by this DTO itself.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password submitted by the client for verification.
     *
     * Server MUST hash this value and compare against
     * econ_discuss_users.password_hash. Never store or log the plaintext.
     * This DTO accepts only the raw password, not a hash or salt.
     */
    password: string & tags.MinLength<8>;

    /**
     * Optional time-based one‑time password (TOTP) or recovery code when
     * econ_discuss_users.mfa_enabled is true or policy requires step-up
     * verification.
     *
     * If provided, it is validated against secrets stored in
     * econ_discuss_users.mfa_secret or
     * econ_discuss_users.mfa_recovery_codes. This value is not stored.
     */
    mfa_code?: (string & tags.MinLength<6> & tags.MaxLength<10>) | undefined;
  };

  /**
   * Refresh request for Member role.
   *
   * Carries the opaque refresh token to rotate session credentials. The
   * service validates token integrity, the underlying econ_discuss_users row
   * (active; deleted_at is null), and the presence of an econ_discuss_members
   * assignment. No database writes are required on the happy path beyond
   * audit outside of this DTO.
   */
  export type IRefresh = {
    /**
     * Refresh token previously issued during login or join, presented for
     * rotation.
     *
     * On success, the service mints a new short‑lived access token (and
     * optionally a rotated refresh token) while validating the member still
     * exists (econ_discuss_users) and remains a member
     * (econ_discuss_members).
     */
    refresh_token: string & tags.MinLength<20>;
  };

  /**
   * Email verification request for Member role.
   *
   * This payload conveys the verification token delivered out‑of‑band (e.g.,
   * email link). The server validates and, on success, flips
   * econ_discuss_users.email_verified to true. No other identity or secret
   * fields are modified by this operation.
   */
  export type IEmailVerifyRequest = {
    /**
     * Time‑limited verification token proving ownership of
     * econ_discuss_users.email.
     *
     * On successful verification the server sets
     * econ_discuss_users.email_verified = true and touches updated_at.
     * Tokens are single-use and short‑lived per policy.
     */
    token: string & tags.MinLength<20>;
  };

  /**
   * Authorization response for Member role containing issued JWTs and subject
   * context.
   *
   * Returned by successful join/login/refresh operations. The payload
   * intentionally excludes sensitive fields (password_hash, mfa_secret,
   * mfa_recovery_codes) and any administrative internals. It provides only
   * safe, public-facing identity hints alongside tokens needed for
   * authenticated requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated member.
     *
     * Directly maps to econ_discuss_users.id (UUID). Use this identifier as
     * the subject claim (sub) in JWTs and for subsequent resource scoping.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /**
     * Authenticated member summary derived from econ_discuss_users.
     *
     * Intended to hydrate clients with profile basics (display name,
     * locale/timezone, verification flags) without exposing sensitive
     * fields like password hashes or MFA secrets.
     */
    member?: IEconDiscussMember.ISubject | undefined;
  };

  /**
   * Minimal member profile snapshot derived from econ_discuss_users.
   *
   * Designed for safe client hydration after authentication. All fields map
   * directly to non-sensitive columns in the Actors schema and exclude
   * confidential credentials and secrets.
   */
  export type ISubject = {
    /**
     * Member’s unique identifier.
     *
     * From econ_discuss_users.id (UUID).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public display name/handle presented on the platform.
     *
     * Maps to econ_discuss_users.display_name. Client editors should
     * enforce reasonable length and character rules per policy.
     */
    displayName: string;

    /**
     * Optional avatar image URI for the member’s profile.
     *
     * Maps to econ_discuss_users.avatar_uri (nullable). Application should
     * validate length and format.
     */
    avatarUri?: (string & tags.MaxLength<80000>) | undefined;

    /**
     * Preferred IANA timezone identifier used for scheduling, digests, and
     * quiet hours (e.g., Asia/Seoul).
     *
     * Maps to econ_discuss_users.timezone (nullable).
     */
    timezone?: string | undefined;

    /**
     * Preferred UI locale (e.g., en-US) used for localized content and
     * notifications.
     *
     * Maps to econ_discuss_users.locale (nullable).
     */
    locale?: string | undefined;

    /**
     * Email ownership confirmation flag.
     *
     * Reflects econ_discuss_users.email_verified. Many write actions are
     * gated until true.
     */
    emailVerified: boolean;

    /**
     * Whether multi‑factor authentication is active for this account.
     *
     * Reflects econ_discuss_users.mfa_enabled. Secrets (mfa_secret,
     * recovery codes) are never exposed.
     */
    mfaEnabled: boolean;

    /**
     * Record creation timestamp from econ_discuss_users.created_at (ISO
     * 8601).
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Record last update timestamp from econ_discuss_users.updated_at (ISO
     * 8601).
     */
    updatedAt: string & tags.Format<"date-time">;
  };

  /**
   * Email verification result payload for member accounts.
   *
   * This DTO reports verification state transitions and resend outcomes for
   * the email associated with an account in econ_discuss_users. It aligns
   * with the Actors schema column econ_discuss_users.email_verified and is
   * used by endpoints that either send a verification email or confirm a
   * verification token.
   *
   * Security note: never expose secrets or tokens here. The server may omit
   * the email field in contexts where revealing it would violate privacy.
   */
  export type IEmailVerification = {
    /**
     * Target account email address used for verification workflows.
     *
     * This corresponds to econ_discuss_users.email in the Actors schema. It
     * is included here for client clarity and may be omitted by the server
     * when not appropriate for privacy.
     */
    email?: (string & tags.Format<"email">) | undefined;

    /**
     * Current verification state of the account’s email.
     *
     * This reflects the econ_discuss_users.email_verified column. In the
     * verify endpoint, this value becomes true upon successful token
     * validation. In resend flows, it often remains false until the user
     * completes verification.
     */
    email_verified: boolean;

    /**
     * High‑level outcome or state label for the verification action.
     *
     * Examples include: queued, sent, throttled, verified,
     * already_verified. This field is not persisted in Prisma; it is
     * reported for API UX and may be used for client messaging.
     */
    status?: string | undefined;

    /**
     * Timestamp when this verification action was requested in ISO 8601
     * format.
     *
     * This value is generated by the service and is not a direct Prisma
     * column.
     */
    requested_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Timestamp when the verification action was processed (e.g., email
     * dispatched or token confirmed), in ISO 8601 format.
     *
     * Not a direct Prisma column; included for client observability.
     */
    processed_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Password reset initiation payload for member accounts.
   *
   * Clients submit the account email to request a time‑limited reset token be
   * delivered out‑of‑band. This does not modify Prisma state directly; it
   * triggers a delivery workflow referencing econ_discuss_users.email.
   */
  export type IPasswordResetRequest = {
    /**
     * Email address identifying the member account to initiate a password
     * reset for.
     *
     * Maps to econ_discuss_users.email (unique). The API must avoid account
     * enumeration by returning generic responses regardless of existence.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Generic security event acknowledgement used by authentication and
   * account‑security endpoints.
   *
   * This DTO standardizes lightweight confirmations for flows such as
   * password reset requests and email verification dispatch/confirmation. It
   * does not expose secrets and does not require any additional Prisma
   * columns.
   */
  export type ISecurityEvent = {
    /**
     * Machine‑readable outcome code for the security operation.
     *
     * Examples: RESET_QUEUED, RESET_CONFIRMED, EMAIL_VERIFICATION_SENT,
     * EMAIL_VERIFIED, MFA_REQUIRED. This is not a Prisma field; it is
     * emitted for client handling and telemetry.
     */
    code: string;

    /**
     * Human‑readable summary describing the security event result.
     *
     * Intended for direct display or logs; avoid leaking sensitive details.
     */
    message: string;

    /**
     * Server time when the event was acknowledged, ISO 8601 format.
     *
     * This reflects when the API produced this event response, not
     * necessarily when any underlying data changed in Prisma.
     */
    timestamp: string & tags.Format<"date-time">;
  };

  /**
   * Password reset confirmation payload for member accounts.
   *
   * On success, the server replaces econ_discuss_users.password_hash with a
   * hash of new_password and updates auditing timestamps (e.g., updated_at).
   * This DTO must never include or accept any password hashes or secrets.
   */
  export type IPasswordResetConfirm = {
    /**
     * Time‑limited password reset token issued by the system and delivered
     * out‑of‑band (e.g., email).
     *
     * The server validates this token and resolves the target
     * econ_discuss_users row; the token itself is never stored in the
     * econ_discuss_users table.
     */
    token: string;

    /**
     * New plaintext password to be set for the account. The backend hashes
     * this value and stores it into econ_discuss_users.password_hash.
     *
     * Security: clients must never send hashed passwords; hashing is solely
     * the server’s responsibility.
     */
    new_password: string & tags.MinLength<8> & tags.Format<"password">;
  };

  /**
   * Change-password request for an authenticated Member.
   *
   * This DTO is used by the password change operation that updates
   * econ_discuss_users.password_hash in the Actors schema. It intentionally
   * accepts plaintext passwords for verification and rotation, while storage
   * remains hashed per the Prisma comment on
   * econ_discuss_users.password_hash. Timestamps like updated_at are
   * system-managed and not part of this request.
   */
  export type IUpdatePassword = {
    /**
     * Current account password in plain text submitted by the authenticated
     * member for verification before rotation.
     *
     * Security and data handling: this value is never persisted; the
     * backend hashes and compares it with econ_discuss_users.password_hash
     * from the Actors schema. The Prisma model documents password_hash as
     * the stored credential; plaintext is only accepted at the API
     * boundary.
     */
    current_password: string & tags.MinLength<8> & tags.Format<"password">;

    /**
     * New password to be set for the account, provided in plain text and
     * hashed server-side before storage.
     *
     * On success, the backend replaces econ_discuss_users.password_hash and
     * updates updated_at in econ_discuss_users (Actors schema). Do not
     * include confirmation fields in the request body; client-side
     * confirmation is handled by the UI, while the server trusts a single
     * source of truth here.
     */
    new_password: string & tags.MinLength<8> & tags.Format<"password">;
  };

  /**
   * MFA enrollment provisioning payload for Members.
   *
   * Returned by the setup endpoint that initializes multi-factor
   * authentication artifacts in econ_discuss_users (mfa_secret and
   * provisional mfa_recovery_codes) while keeping mfa_enabled=false until
   * verification. Per the Prisma schema comments, secrets and recovery codes
   * are stored encrypted/hashed and never logged.
   */
  export type IMfaSetup = {
    /**
     * Provisioning URI (otpauth://…) that encodes the TOTP secret and label
     * for authenticator enrollment.
     *
     * The secret is stored securely in econ_discuss_users.mfa_secret
     * (Actors schema) and should not be logged. This URI allows the client
     * to configure an authenticator app without exposing internal storage
     * details.
     */
    otpauth_uri: string;

    /**
     * Optional expiry for the enrollment session, after which a new setup
     * must be initiated.
     *
     * This timestamp is not persisted in Prisma; it is advisory for the
     * client to complete verification before the window ends.
     */
    expires_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Verification request body to finalize MFA enrollment for a Member.
   *
   * Exactly one credential must be provided: either a TOTP code (code) or a
   * recovery_code. On success, the backend sets
   * econ_discuss_users.mfa_enabled=true and updates updated_at. Secrets
   * remain server-side and are never returned.
   */
  export type IMfaVerify = any | any;

  /**
   * Confirmation payload reporting the current MFA enabled state for a Member
   * account.
   *
   * Returned after verification succeeds (mfa_enabled=true) or in status
   * checks. Sensitive MFA internals (mfa_secret, mfa_recovery_codes) from
   * econ_discuss_users are never exposed here.
   */
  export type IMfaEnabled = {
    /**
     * Indicates whether multi-factor authentication is now enabled for the
     * account.
     *
     * This mirrors the econ_discuss_users.mfa_enabled column in the Actors
     * schema, which is flipped to true after successful verification and to
     * false when MFA is disabled.
     */
    mfa_enabled: boolean;

    /**
     * Timestamp when MFA became enabled for the account.
     *
     * This value reflects system time at activation; the underlying Prisma
     * model provides updated_at on econ_discuss_users for auditing, while
     * this field offers a user-facing instant for confirmation.
     */
    enabled_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Request body to disable MFA for a Member account.
   *
   * Exactly one credential must be provided: either totp_code or
   * recovery_code. On success, the service updates
   * econ_discuss_users.mfa_enabled=false and may clear or rotate MFA secrets
   * per policy.
   */
  export type IMfaDisable = any | any;

  /**
   * Confirmation payload returned after disabling Multi-Factor Authentication
   * (MFA) for a Member.
   *
   * This response reflects the new MFA state persisted in econ_discuss_users
   * (mfa_enabled=false) and includes operational details such as the
   * effective timestamp. It documents whether the provider cleared/rotated
   * sensitive MFA artifacts stored in econ_discuss_users.mfa_secret and
   * econ_discuss_users.mfa_recovery_codes as described by the Prisma schema.
   */
  export type IMfaDisabled = {
    /**
     * Reflects the current MFA state on the account in
     * econ_discuss_users.mfa_enabled after the disable operation.
     *
     * Per policy, disabling sets this to false.
     */
    mfa_enabled: false;

    /**
     * ISO 8601 timestamp indicating when MFA was disabled for the account.
     *
     * This corresponds to the time the service updated econ_discuss_users
     * to reflect MFA disablement.
     */
    disabled_at: string & tags.Format<"date-time">;

    /**
     * Indicates whether the server cleared or rotated
     * econ_discuss_users.mfa_secret as part of the disable flow.
     *
     * Security policy may clear or re-encrypt the secret. True means the
     * stored secret was removed/rotated.
     */
    secret_cleared?: boolean | undefined;

    /**
     * Indicates whether the server cleared/rotated
     * econ_discuss_users.mfa_recovery_codes during disablement.
     *
     * True means previously generated recovery codes were invalidated.
     */
    recovery_codes_cleared?: boolean | undefined;
  };

  /**
   * Request body to regenerate MFA recovery codes for a Member.
   *
   * The service validates the submitted TOTP code against
   * econ_discuss_users.mfa_secret. Upon success, it rotates
   * econ_discuss_users.mfa_recovery_codes and returns the freshly generated
   * codes for one-time display, as documented in the Prisma Actors schema
   * (econ_discuss_users).
   */
  export type IMfaRegenerateCodes = {
    /**
     * A current TOTP value derived from econ_discuss_users.mfa_secret to
     * authorize regeneration of recovery codes.
     *
     * Business rule: The member must already have MFA enabled
     * (econ_discuss_users.mfa_enabled=true). Regeneration replaces
     * econ_discuss_users.mfa_recovery_codes with a new set.
     */
    totp_code: string &
      tags.MinLength<6> &
      tags.MaxLength<12> &
      tags.Pattern<"^[0-9]{6,12}$">;
  };

  /**
   * Response payload containing freshly generated MFA recovery codes for a
   * Member.
   *
   * These codes replace any previous set stored in
   * econ_discuss_users.mfa_recovery_codes (Actors schema) and are shown once.
   * The account remains MFA-enabled (econ_discuss_users.mfa_enabled=true).
   * Clients should prompt users to store codes securely offline and never
   * transmit them in logs.
   */
  export type IMfaRecoveryCodes = {
    /**
     * Reflects that MFA remains enabled on the account
     * (econ_discuss_users.mfa_enabled=true) after regenerating recovery
     * codes.
     *
     * Regeneration does not alter the enabled state.
     */
    mfa_enabled: true;

    /**
     * Newly generated recovery codes for the member. Displayed exactly once
     * after regeneration, never retrievable again.
     *
     * These correspond to values stored (hashed/secured) in
     * econ_discuss_users.mfa_recovery_codes.
     */
    codes: (string & tags.MinLength<8> & tags.MaxLength<128>)[] &
      tags.MinItems<1> &
      tags.MaxItems<20>;

    /**
     * ISO 8601 timestamp when the recovery codes were generated.
     *
     * Useful for client-side record keeping; not necessarily persisted
     * beyond audit trails.
     */
    generated_at: string & tags.Format<"date-time">;
  };
}
