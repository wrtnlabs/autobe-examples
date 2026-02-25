import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallSeller {
  /**
   * Authentication response for seller sessions. Contains the seller's unique identifier, JWT access and refresh tokens, and access token expiration timestamp. Used by the client to maintain authenticated state across API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated seller.
     *
     * @x-autobe-specification The id is derived from the seller_id claim in the JWT access token payload, generated from the shopping_mall_sellers.id field. The value is embedded in the JWT during signing and does not represent a direct database property mapping since the object-level databaseSchema is null.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;

    /**
     * ISO 8601 timestamp indicating when the access token expires and must be refreshed.
     *
     * @x-autobe-specification Extracted from the exp claim of the generated JWT access token. Set to 30 minutes after token issuance. This value is computed during token signing and not stored in the database; it is included in the response to inform the client when to refresh.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request body containing the seller's email and plaintext password for authentication.
   */
  export type ILogin = {
    /**
     * The seller's registered email address used to identify their account for login.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from shopping_mall_sellers.email. Used to look up seller account during authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * The seller's plaintext password used to authenticate their identity. This value is never stored or persisted; it is only used to verify against the stored password hash.
     *
     * @x-autobe-specification Plain text password provided by seller. Backend compares this against the bcrypt hash stored in shopping_mall_sellers.password_hash during authentication. Never stored or returned.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Submit a valid refresh token obtained from a previous authentication session to receive a new access token and a new refresh token. This endpoint implements token rotation: the submitted refresh token is immediately invalidated after use to prevent replay attacks.
   */
  export type IRefresh = {
    /**
     * Submit a valid refresh token obtained from a previous authentication session to receive a new access token and a new refresh token. This endpoint implements token rotation: the submitted refresh token is immediately invalidated after use to prevent replay attacks.
     *
     * @x-autobe-specification JWT refresh token. Must be exactly as issued by system and unmodified. This token is not stored directly as a database column. Instead, it is a generated cryptographic JWT that is serialized and stored in the session state (shopping_mall_seller_sessions) as a complete entity. During refresh validation, the entire session record is retrieved and the JWT is parsed and validated against its signature, expiration, and issuer claims using the system's cryptographic key. The token exists in session context, not as a discrete database field.
     */
    refresh_token: string;
  };

  /**
   * Registration request for a new seller account. Contains the email address and password used to create the seller's authentication identity. The password must be strong (minimum 12 characters with mixed case, numbers, and special symbols). This request initiates account creation but does not grant login access until the seller is approved by an administrator.
   */
  export type IJoin = {
    /**
     * The seller's unique email address used for account creation and communication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from shopping_mall_sellers.email. Must be a unique, valid email address as per RFC 5322. The system enforces uniqueness at database level via unique index.
     */
    email: string & tags.Format<"email">;

    /**
     * The seller's chosen password for authentication. Must be at least 12 characters and include uppercase letters, lowercase letters, numbers, and special symbols to meet security requirements.
     *
     * @x-autobe-specification The plaintext password provided by the seller is hashed server-side using bcrypt before being stored in shopping_mall_sellers.password_hash. Minimum length is enforced as 12 characters with complexity rules (uppercase, lowercase, digit, symbol). The 'password' field never reaches the database; only its hash does.
     */
    password: string & tags.MinLength<12>;
  };

  /**
   * A lightweight public summary of a seller's identity for customer-facing interfaces. Contains only the essential, immutable information needed to identify the seller: shop name, logo URL, and approval status. Designed to prevent privacy leaks and ensure consistent display across product listings, cart items, and order confirmations.
   */
  export type ISummary = {
    /**
     * The official name of the seller's shop as displayed to customers.
     *
     * @x-autobe-specification Computed from the latest shopping_mall_seller_profile_snapshots record where seller_id = shopping_mall_sellers.id. Shows the seller's shop name as it was at the time of last profile update.
     */
    shop_name: string;

    /**
     * URL of the seller's logo image, used for visual identification in product listings and checkout.
     *
     * @x-autobe-specification Computed from the latest shopping_mall_seller_profile_snapshots record where seller_id = shopping_mall_sellers.id. Shows the seller's logo URL as it was at the time of last profile update.
     */
    logo_url: string;

    /**
     * The approval status of the seller account: 'pending' (registration submitted), 'approved' (verified and active), or 'rejected' (denied by admin).
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from shopping_mall_sellers.status. Value must be one of 'pending', 'approved', or 'rejected' as defined in 09-cancellation-refund.md.
     */
    status: string;
  };
}
