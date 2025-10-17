export namespace IEconDiscussVerifiedExpertMfaVerify {
  /**
   * Verification request to complete MFA (2FA) enrollment for a verified
   * expert.
   *
   * Submit exactly one of totp_code (preferred) or recovery_code. On success,
   * the server enables MFA by setting
   * Actors.econ_discuss_users.mfa_enabled=true and updates
   * Actors.econ_discuss_users.updated_at. Secrets (mfa_secret, recovery
   * codes) are never exposed in responses.
   */
  export type ICreate = any | any;
}
