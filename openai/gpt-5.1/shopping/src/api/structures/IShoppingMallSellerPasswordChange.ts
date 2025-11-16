export namespace IShoppingMallSellerPasswordChange {
  /**
   * Request schema for an authenticated seller to change their password.
   *
   * The seller must provide their current password and the desired new
   * password. The backend validates the current password against the stored
   * password_hash in shopping_mall_auth_credentials for the authenticated
   * seller and, on success, updates the password_hash to reflect the new
   * password.
   *
   * This DTO never includes any actor identifiers such as seller_id or auth
   * credential IDs; those are derived from the authenticated context on the
   * server.
   */
  export type IRequest = {
    /**
     * The seller's current password in plain text.
     *
     * Used to re-authenticate the seller by validating against the existing
     * password_hash in shopping_mall_auth_credentials associated with the
     * authenticated seller account.
     */
    currentPassword: string;

    /**
     * The seller's desired new password in plain text.
     *
     * The backend applies platform password policy validation and, if
     * accepted, hashes this value and stores it in the password_hash field
     * of shopping_mall_auth_credentials for the authenticated seller.
     */
    newPassword: string;
  };

  /**
   * Response schema indicating the result of an authenticated seller password
   * change attempt.
   *
   * This DTO is returned by POST /auth/seller/password/change after
   * validating the current password against shopping_mall_auth_credentials
   * and, on success, updating the password hash and writing audit logs. It
   * never exposes any password or password_hash data and only communicates
   * high‑level outcome and optional error context.
   */
  export type IResponse = {
    /**
     * Flag indicating whether the seller password change operation
     * completed successfully.
     */
    success: boolean;

    /**
     * Human‑readable message summarizing the outcome of the password change
     * attempt. Useful for display in UI notifications.
     */
    message: string;

    /**
     * Optional machine‑readable error code when success is false. Can be
     * used by clients to handle specific failure reasons such as
     * INVALID_CURRENT_PASSWORD or WEAK_NEW_PASSWORD.
     */
    errorCode?: string | undefined;
  };
}
