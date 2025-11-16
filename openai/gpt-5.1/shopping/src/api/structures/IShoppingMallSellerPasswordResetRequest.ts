import { tags } from "typia";

export namespace IShoppingMallSellerPasswordResetRequest {
  /**
   * Request payload to initiate a password reset flow for a seller.
   *
   * The client provides the seller's login email address so that the backend
   * can locate the corresponding authentication credentials, create a
   * password reset token, and send a reset link via out-of-band channels such
   * as email. The API always responds with a generic acknowledgment so that
   * account existence cannot be inferred from this call.
   */
  export type IRequest = {
    /**
     * Email address of the seller account for which a password reset should
     * be initiated. The backend uses this to locate the associated
     * credentials record while ensuring that the response does not reveal
     * whether the account exists.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Response DTO for initiating a seller password reset request.
   *
   * This schema represents the public-facing acknowledgment returned after a
   * seller submits a password reset request. It intentionally does not reveal
   * whether a matching seller account or credentials record exists in the
   * system, thereby preventing attackers from probing for valid email
   * addresses.
   *
   * The response indicates only that the reset process has been accepted for
   * processing (if possible) and that, when appropriate, a password reset
   * email or out-of-band notification will be sent. Internal details about
   * shopping_mall_auth_credentials or shopping_mall_password_reset_tokens are
   * never exposed through this DTO.
   */
  export type IResponse = {
    /**
     * Indicates whether the password reset request was accepted for
     * processing.
     *
     * This flag is typically true when the request payload is syntactically
     * valid and the system has performed all necessary checks and side
     * effects (such as logging security events), regardless of whether a
     * matching seller account actually exists. It may be false only in
     * cases where the request itself is invalid or the operation cannot be
     * performed due to system-level errors.
     */
    success: boolean;

    /**
     * Human-readable message describing the outcome of the password reset
     * request initiation.
     *
     * This message should be phrased in a generic way that does not reveal
     * whether a seller account exists for the provided identifier. For
     * example, it may say that if an account is associated with the
     * provided email, a reset link will be sent. The message is intended
     * for display in client applications and may be localized at the
     * presentation layer.
     */
    message: string;
  };
}
