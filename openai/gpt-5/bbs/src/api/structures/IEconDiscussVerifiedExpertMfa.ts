import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertMfa {
  /**
   * Response payload returned when initiating MFA (2FA) enrollment for a
   * verified expert.
   *
   * It supplies an otpauth:// provisioning URI derived from the TOTP secret
   * that the server has stored (encrypted) in econ_discuss_users.mfa_secret.
   * MFA remains disabled (econ_discuss_users.mfa_enabled=false) until the
   * user verifies a code via the verification endpoint. Recovery codes are
   * not included here; they may be delivered through a dedicated endpoint or
   * after successful verification as policy dictates.
   *
   * Security note: The provisioning URI contains secret material and must be
   * handled with care (e.g., one-time display, avoid logging).
   */
  export type IEnroll = {
    /**
     * Provisioning URI for authenticator apps in the standard otpauth://
     * format.
     *
     * This URI encodes the server-generated secret that is stored encrypted
     * in econ_discuss_users.mfa_secret. It is presented to the user exactly
     * once at enrollment time to initialize a TOTP application. The value
     * is not persisted in client storage by the server and must not be
     * logged.
     */
    otpauth_uri: string & tags.Format<"uri">;

    /**
     * Optional expiration timestamp (ISO 8601) for the enrollment session.
     *
     * This is not a Prisma column but an application-level guardrail to
     * limit how long the presented provisioning data should be considered
     * valid before re-initiation is required.
     */
    provisioning_expires_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Status representation of MFA settings for a verified expert account.
   *
   * This payload exposes only non-sensitive state derived from
   * econ_discuss_users: the boolean mfa_enabled flag and the updated_at
   * timestamp. It never includes secrets like mfa_secret or recovery codes
   * and is suitable for account settings displays and post-verification
   * confirmations.
   */
  export type IStatus = {
    /**
     * Current MFA enablement flag for the account.
     *
     * Directly reflects Actors.econ_discuss_users.mfa_enabled. True after
     * successful verification; false during enrollment or after
     * disablement.
     */
    mfa_enabled: boolean;

    /**
     * Timestamp (ISO 8601) when the MFA-related state was last updated for
     * this user.
     *
     * Maps to Actors.econ_discuss_users.updated_at, providing clients with
     * a synchronization point for security settings.
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Response body carrying the one-time display of newly generated MFA
   * recovery codes for a verified expert.
   *
   * Prisma references:
   *
   * - Econ_discuss_users.mfa_recovery_codes: newly generated and stored in
   *   hashed/encrypted form
   *
   * Note: This object is ephemeral for client consumption; it is not a direct
   * row from any Prisma model.
   */
  export type IRecoveryCodes = {
    /**
     * List of freshly generated recovery codes. Shown exactly once to the
     * client after rotation.
     *
     * Privacy and security:
     *
     * - Do not return after initial reveal
     * - Encourage offline/secure storage
     * - Codes will be stored hashed/encrypted at rest
     */
    codes: (string & tags.Pattern<"^[A-Za-z0-9-]{8,64}$">)[] & tags.MinItems<5>;
  };
}
