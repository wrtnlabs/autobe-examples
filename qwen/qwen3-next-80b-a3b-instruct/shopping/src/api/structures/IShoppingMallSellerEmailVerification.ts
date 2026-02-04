import { tags } from "typia";

export namespace IShoppingMallSellerEmailVerification {
  /**
   * Verification token issued for seller email verification. This DTO contains a single token string that is cryptographically generated and sent to the seller's registered email address during registration. The client presents this token in the POST /shoppingMall/seller/auth/sellers/email/verify endpoint to finalize account verification. The server validates this token against the database to ensure it is valid, not expired, and has not been used before. This is a strict contract - no other properties are allowed.
   */
  export type IRequest = {
    /**
     * A cryptographically secure, single-use verification token sent to the seller's registered email address. This token must be presented to verify the seller's email ownership. Must be 32-128 characters long and contain only alphanumeric characters, hyphens, or underscores. The server validates this token against the verification token database table and confirms it is valid, not expired, and not previously used before marking the seller account as verified. This token is cleared from the database after successful verification to prevent reuse and ensure security. This value is required and must be provided in the request body of the verify endpoint.
     *
     * @x-autobe-specification Required cryptographically secure token with 32-128 alphanumeric characters and hyphens/underscores only. This token must be presented by the client to be validated against the verification_token column in the shopping_mall_seller_email_verifications table. The server checks expiration time and usage status. Token is not stored as a column in the database; it is transmitted by the client for server-side validation.
     */
    token: string &
      tags.MinLength<32> &
      tags.MaxLength<128> &
      tags.Pattern<"^[a-zA-Z0-9-_]+$">;
  };
}
