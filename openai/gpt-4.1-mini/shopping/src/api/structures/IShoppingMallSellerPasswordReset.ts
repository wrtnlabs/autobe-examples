import { tags } from "typia";

import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallSellerPasswordReset {
  /**
   * Summary view of seller password reset token metadata, including lifecycle timestamps and the associated seller's summary information.
   */
  export type ISummary = {
    /**
     * Unique identifier of the password reset token.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_seller_password_resets.id column as UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique token string used to verify password reset requests.
     *
     * @x-autobe-database-schema-property token
     * @x-autobe-specification Direct mapping from shopping_mall_seller_password_resets.token unique string for reset token verification.
     */
    token: string;

    /**
     * Timestamp when the reset token was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_password_resets.created_at timestamp showing token creation datetime.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the reset token expires.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_password_resets.expired_at timestamp indicating token expiry datetime.
     */
    expiredAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the reset token was used; null if never used.
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Nullable datetime mapping from shopping_mall_seller_password_resets.used_at indicating when token was used, or null if unused.
     */
    usedAt: (string & tags.Format<"date-time">) | null;

    /**
     * Soft delete timestamp; null means not deleted.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Nullable datetime mapping from shopping_mall_seller_password_resets.deleted_at for soft delete tracking.
     */
    deletedAt: (string & tags.Format<"date-time">) | null;

    /**
     * Summary information about the seller associated with this password reset.
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification Mapped from shopping_mall_seller_password_resets.seller_id FK relation to shopping_mall_sellers simplifying nested object with IShoppingMallSeller.ISummary schema.
     */
    seller: IShoppingMallSeller.ISummary;
  };

  /**
   * Request DTO schema for querying seller password reset tokens with advanced filters, range date filtering, and pagination controls.
   */
  export type IRequest = {
    /**
     * UUID of the seller to filter password reset tokens. Nullable for optional filtering.
     *
     * @x-autobe-database-schema-property seller_id
     * @x-autobe-specification Maps to shopping_mall_seller_password_resets.seller_id column for filtering tokens by specific seller UUID.
     */
    sellerId?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Token string to search password reset tokens.
     *
     * @x-autobe-database-schema-property token
     * @x-autobe-specification Direct mapping to shopping_mall_seller_password_resets.token column. Enables partial string matching filter.
     */
    token?: string | null | undefined;

    /**
     * Start datetime to filter tokens by creation time.
     *
     * @x-autobe-specification Filters records where created_at timestamp is greater than or equal to this datetime.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * End datetime to filter tokens by creation time.
     *
     * @x-autobe-specification Filters records where created_at timestamp is less than or equal to this datetime.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Start datetime to filter tokens by expiration time.
     *
     * @x-autobe-specification Filters records where expired_at timestamp is greater than or equal to this datetime.
     */
    expiredAtFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * End datetime to filter tokens by expiration time.
     *
     * @x-autobe-specification Filters records where expired_at timestamp is less than or equal to this datetime.
     */
    expiredAtTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Start datetime to filter tokens by usage time.
     *
     * @x-autobe-specification Filters records where used_at timestamp is greater than or equal to this datetime.
     */
    usedAtFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * End datetime to filter tokens by usage time.
     *
     * @x-autobe-specification Filters records where used_at timestamp is less than or equal to this datetime.
     */
    usedAtTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Boolean indicating filter to include only soft deleted tokens or exclude them.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Filters records by whether deleted_at is null or not. True means only soft deleted tokens, false means exclude soft deleted tokens.
     */
    deleted?: boolean | null | undefined;

    /**
     * Page number for pagination of results.
     *
     * @x-autobe-specification Page number to retrieve. Minimum value is 1.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of records per page.
     *
     * @x-autobe-specification Maximum number of records per page. Minimum 1, maximum 100.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Sort order criteria for password reset tokens.
     *
     * @x-autobe-specification Sort order string indicating which fields and directions to sort by (e.g. 'createdAt desc').
     */
    sort?: string | null | undefined;

    /**
     * Search string to filter password reset tokens by relevant text.
     *
     * @x-autobe-specification Text filter for free-text search in token or other text fields.
     */
    search?: string | null | undefined;
  };
}
