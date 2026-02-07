export namespace IShoppingMallAdminEmailVerification {
  /**
   * Request body for resending admin email verification token to trigger a new verification email.
   */
  export type ICreate = {};

  /**
   * Response body for admin email verification resending operation. Confirms that a new verification token has been generated and sent to the admin's email address. The token will expire at the specified time and the admin must verify their email before full account functionality is available.
   */
  export type IResponse = {};
}
