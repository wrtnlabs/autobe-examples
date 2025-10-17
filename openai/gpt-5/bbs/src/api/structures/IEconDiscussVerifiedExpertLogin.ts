import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertLogin {
  /**
   * Verified Expert login request DTO.
   *
   * Accepts email and plaintext password; optionally includes an MFA one-time
   * code when the account requires step-up authentication. On success, the
   * service returns IEconDiscussVerifiedExpert.IAuthorized and issues tokens.
   * This DTO never carries system-managed fields or secrets such as password
   * hashes or MFA secrets; only the ephemeral OTP may be provided when
   * required.
   */
  export type ICreate = {
    /**
     * Login identifier mapped to econ_discuss_users.email.
     *
     * The backend looks up the user by this value (normalized) and
     * validates credentials.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password used to validate against
     * econ_discuss_users.password_hash.
     *
     * Never transmit pre-hashed material from clients; servers perform
     * hashing and comparison.
     */
    password: string & tags.MinLength<8>;

    /**
     * Optional one-time code for accounts with MFA enabled.
     *
     * When econ_discuss_users.mfa_enabled is true or policy requires
     * step-up, supply a valid TOTP or recovery code. This field is ignored
     * when MFA is not required.
     */
    otp?: (string & tags.MinLength<6> & tags.MaxLength<10>) | undefined;
  };
}
