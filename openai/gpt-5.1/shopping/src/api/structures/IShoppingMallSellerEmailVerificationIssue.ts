import { tags } from "typia";

export namespace IShoppingMallSellerEmailVerificationIssue {
  /**
   * Request payload for issuing a new email verification token for a seller.
   *
   * This DTO is used when a seller requests that a verification email be
   * (re)sent to confirm ownership of their email address. The operation is
   * invoked by an authenticated seller, so seller identity comes from the
   * authentication context and MUST NOT be supplied in the body.
   *
   * The payload carries only minimal email and context information needed to
   * drive verification and messaging behavior.
   */
  export type IRequest = {
    /**
     * Seller email address that should be verified.
     *
     * This must match the email stored in the seller's authentication
     * credentials, and is used to determine which credentials record in
     * shopping_mall_auth_credentials requires a new verification token.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Response DTO returned after initiating an email verification process for
   * a seller account.
   *
   * Indicates that an email verification token has been issued and dispatched
   * via email for the seller's credentials. Does not include the raw
   * verification token value for security reasons. Clients use this response
   * only to confirm that the flow has started and to inform the seller to
   * check their inbox.
   */
  export type IResponse = {
    /**
     * Indicates whether the email verification issuance request was
     * accepted and processed successfully. When false, the client should
     * treat the request as failed and may present an appropriate error
     * message based on HTTP status and error body.
     */
    success: boolean;

    /**
     * Human-readable message summarizing the outcome of the verification
     * issuance request, such as "Verification email has been sent".
     * Intended primarily for display in client UIs and logs.
     */
    message: string;
  };
}
