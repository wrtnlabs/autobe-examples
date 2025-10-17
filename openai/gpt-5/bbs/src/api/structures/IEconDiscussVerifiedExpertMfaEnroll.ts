import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertMfaEnroll {
  /**
   * Request payload to begin MFA (2FA) enrollment for a verified expert.
   *
   * This DTO starts the TOTP enrollment process backed by Prisma table
   * Actors.econ_discuss_users. The server will generate and store an
   * encrypted TOTP secret in econ_discuss_users.mfa_secret and prepare
   * recovery codes in econ_discuss_users.mfa_recovery_codes, while leaving
   * econ_discuss_users.mfa_enabled=false until the verification step
   * succeeds. No secrets are accepted from the client; the server generates
   * them.
   *
   * Security note: Do not include sensitive values such as the TOTP secret in
   * requests. The enrollment response provides a provisioning URI suitable
   * for authenticator apps.
   */
  export type ICreate = {
    /**
     * MFA enrollment method requested by the verified expert.
     *
     * Only Time-based One-Time Password (TOTP) is supported for econDiscuss
     * verified experts at this time. This aligns with the
     * econ_discuss_users Prisma model, which stores TOTP secrets in
     * mfa_secret and recovery codes in mfa_recovery_codes. Choosing "totp"
     * instructs the server to allocate and store a new encrypted secret for
     * the current account while keeping mfa_enabled=false until
     * verification completes.
     */
    method: "totp";

    /**
     * Optional human-friendly label for the authenticator device (e.g.,
     * "Personal Phone", "Work Phone").
     *
     * This is not persisted in the econ_discuss_users Prisma model but can
     * be stored by the application for UX purposes. Use this to help the
     * user recognize which authenticator was enrolled.
     */
    device_label?: (string & tags.MaxLength<100>) | undefined;
  };
}
