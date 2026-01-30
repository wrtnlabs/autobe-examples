export namespace ITodoAppPasswordResetToken {
  /**
   * Request DTO for verifying a password reset token.
   *
   * Used when a member clicks the password reset link in their email and the
   * application needs to validate the token before allowing a password
   * change. The token is extracted from the reset URL and sent to the
   * verification endpoint to confirm it exists and has not expired.
   *
   * Upon successful verification, the endpoint returns minimal member
   * information (id and email) that can be used for the subsequent password
   * reset operation. Invalid or expired tokens result in 401 or 410 error
   * responses respectively.
   */
  export type IVerify = {
    /**
     * The password reset token extracted from the reset email link. This
     * UUID token is used to lookup and validate the reset request in the
     * database.
     *
     * @x-autobe-specification Raw input value provided by the user from their password reset email link. This UUID string is used to lookup and validate against the todo_app_password_reset_tokens table. Implementation: Query todo_app_password_reset_tokens WHERE token = :token AND expires_at > NOW(). The token column in the database is a unique UUID with NOT NULL constraint. Validation must fail with 401 if no matching record found, and 410 if token exists but is expired.
     */
    token: string;
  };
}
