import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertMfaDisable {
  /**
   * Payload for disabling MFA using a TOTP code.
   *
   * Prisma references:
   *
   * - Econ_discuss_users.mfa_secret: used to validate totp_code
   * - Econ_discuss_users.mfa_enabled: will be set to false upon successful
   *   disable
   *
   * This object is selected by the discriminator value method="totp".
   */
  export type ITotp = {
    /**
     * Discriminator indicating the TOTP-based MFA disable flow.
     *
     * Use this when disabling MFA by validating a time-based one-time
     * password generated from the secret stored in
     * econ_discuss_users.mfa_secret.
     */
    method: "totp";

    /**
     * Time-based one-time password (TOTP) to authorize MFA disable.
     *
     * Validation:
     *
     * - 6-digit numeric string
     * - Verified against econ_discuss_users.mfa_secret within standard time
     *   window
     *
     * Example: "123456"
     */
    totp_code: string & tags.Pattern<"^[0-9]{6}$">;
  };

  /**
   * Payload for disabling MFA using a recovery code.
   *
   * Prisma references:
   *
   * - Econ_discuss_users.mfa_recovery_codes: validated/consumed during disable
   * - Econ_discuss_users.mfa_enabled: will be set to false upon successful
   *   disable
   *
   * This object is selected by the discriminator value method="recovery".
   */
  export type IRecovery = {
    /**
     * Discriminator indicating the recovery-code–based MFA disable flow.
     *
     * This explicitly selects the recovery code method for disabling MFA on
     * the account stored in Prisma table Actors.econ_discuss_users. When
     * method is "recovery", a valid recovery code previously generated into
     * econ_discuss_users.mfa_recovery_codes must be supplied.
     */
    method: "recovery";

    /**
     * A single-use recovery code provisioned during MFA setup or rotation.
     *
     * Business rules:
     *
     * - Must match one of the hashed/encrypted codes stored in
     *   econ_discuss_users.mfa_recovery_codes
     * - Consumed on use and rotated/invalidated per policy
     *
     * Examples: "X7K2-9QJP" or "A1B2C3D4E5"
     */
    recovery_code: string & tags.Pattern<"^[A-Za-z0-9-]{8,64}$">;
  };

  /**
   * Request body to disable MFA for a verified expert account.
   *
   * This union uses discriminator property "method" to select one of two
   * flows:
   *
   * - Method = "totp" → provide a 6-digit TOTP code
   *   (IEconDiscussVerifiedExpertMfaDisable.ITotp)
   * - Method = "recovery" → provide a recovery code
   *   (IEconDiscussVerifiedExpertMfaDisable.IRecovery)
   *
   * Prisma references:
   *
   * - Actors.econ_discuss_users.mfa_secret, mfa_recovery_codes: used for
   *   validation
   * - Actors.econ_discuss_users.mfa_enabled: set to false upon successful
   *   disable
   *
   * Security: Do not log codes; enforce rate limits and step-up verification
   * policies.
   */
  export type ICreate =
    | IEconDiscussVerifiedExpertMfaDisable.ITotp
    | IEconDiscussVerifiedExpertMfaDisable.IRecovery;
}
