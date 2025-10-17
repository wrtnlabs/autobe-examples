import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertMfaRecovery {
  /**
   * Request body to regenerate MFA recovery codes for a verified expert
   * account.
   *
   * Prisma references:
   *
   * - Econ_discuss_users.mfa_secret: used to validate totp_code
   * - Econ_discuss_users.mfa_recovery_codes: replaced with a new set upon
   *   success
   *
   * Security: Display new recovery codes only once; never store or return
   * plaintext codes beyond initial reveal.
   */
  export type ICreate = {
    /**
     * Current TOTP code from the authenticator app to authorize
     * regeneration of recovery codes.
     *
     * Validated against econ_discuss_users.mfa_secret. Typical 6-digit
     * numeric string, valid within standard time window.
     *
     * Example: "123456"
     */
    totp_code: string & tags.Pattern<"^[0-9]{6}$">;
  };
}
