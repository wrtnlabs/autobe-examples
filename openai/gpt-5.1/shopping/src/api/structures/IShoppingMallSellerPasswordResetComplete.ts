export namespace IShoppingMallSellerPasswordResetComplete {
  /**
   * Request DTO for completing a seller password reset using a previously
   * issued reset token.
   *
   * Clients call this operation when a seller follows a password reset link
   * or otherwise obtains a valid password reset token. The request supplies
   * the opaque token string along with the seller's new password. The backend
   * validates and consumes the token stored in
   * shopping_mall_password_reset_tokens and updates the corresponding
   * credentials record in shopping_mall_auth_credentials with a new password
   * hash.
   *
   * The DTO carries only user-supplied data. It does not include any actor
   * identifiers or credential record IDs; those are resolved on the server
   * side based on the token. Additional session or context fields (such as
   * ip, href, referrer) are not required here because this operation does not
   * establish a new authenticated session; it only updates existing
   * credentials.
   */
  export type IRequest = {
    /**
     * Opaque password reset token string issued earlier during the reset
     * request flow.
     *
     * This value corresponds to the token column in
     * shopping_mall_password_reset_tokens and is used to look up and
     * validate the reset token row. The token must be treated as a secret
     * value and is typically delivered to the seller via email or other
     * out-of-band channel. It should be unguessable and validated against
     * expiration and consumption rules.
     */
    token: string;

    /**
     * New password that the seller wishes to set for their account.
     *
     * The backend will hash this value and store the result in the
     * password_hash (or equivalent) field of the relevant row in
     * shopping_mall_auth_credentials. Clients must never pre-hash this
     * value. Server-side validation should enforce strength requirements
     * such as minimum length and complexity, but those rules are applied in
     * service logic rather than encoded directly in this schema.
     */
    password: string;
  };

  /**
   * Response schema for completing a seller password reset using a password
   * reset token.
   *
   * Indicates whether the password reset operation succeeded after validating
   * and consuming a token from shopping_mall_password_reset_tokens and
   * updating the corresponding credentials in shopping_mall_auth_credentials.
   * It does not expose any sensitive credential information and is
   * intentionally minimal for security reasons.
   */
  export type IResponse = {
    /**
     * Indicates whether the seller password reset and token consumption
     * completed successfully.
     *
     * True when the provided token was valid, not expired, not previously
     * consumed, and the associated credentials record in
     * shopping_mall_auth_credentials was successfully updated with a new
     * password_hash. false when validation failed or the operation could
     * not be completed.
     */
    success: boolean;
  };
}
