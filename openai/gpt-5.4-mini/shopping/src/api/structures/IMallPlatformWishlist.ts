import { tags } from "typia";

import { IMallPlatformProduct } from "./IMallPlatformProduct";

export namespace IMallPlatformWishlist {
  /**
   * Wishlist browsing criteria for the authenticated customer's saved products.
   *
   * Use this request body to control search, pagination, and sorting when listing the current customer's wishlist. Ownership is resolved from the authenticated session, so no customer or wishlist identifiers are included.
   *
   * This DTO is read-only and exists only to query saved products for display; it does not create, update, or delete wishlist data.
   */
  export type IRequest = {
    /**
     * Search text used to filter saved products in the wishlist.
     *
     * The server applies this text to the authenticated customer's joined wishlist products when returning browse results. It is a request-only filter and is not stored as wishlist data.
     *
     * @x-autobe-specification Free-text filter for the authenticated customer's wishlist browsing query. Apply this value to the joined product records associated with the customer's wishlist items, typically against product name and other browseable product text fields. This field is request-only and has no direct database mapping.
     */
    search?: string | undefined;

    /**
     * Page number for the wishlist result set.
     *
     * Use this value to choose which slice of the authenticated customer's saved products is returned. The first page is 1.
     *
     * @x-autobe-specification 1-indexed page number for wishlist pagination. Combine this value with `limit` to calculate the result window over the authenticated customer's wishlist items. This is request-only pagination metadata and does not map to a database field.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of wishlist items to return per page.
     *
     * Use this value to control the size of each paginated response. The actual number of returned items may be lower on the final page.
     *
     * @x-autobe-specification Maximum number of wishlist results to return on one page. Combine this value with `page` to constrain the number of joined product summaries returned for the authenticated customer's wishlist. This is request-only pagination metadata and does not map to a database field.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Sort order for the wishlist result set.
     *
     * Use this value to choose how saved products are ordered in the paginated response. The exact sort options are interpreted by the server.
     *
     * @x-autobe-specification Sorting directive for wishlist browsing. The server interprets this value to order the authenticated customer's saved products, typically by product creation time, saved time, or other supported browse ordering. This field is request-only query logic and has no direct database column mapping.
     */
    sort?: string | undefined;
  };

  /**
   * A saved product entry in a customer's wishlist.
   *
   * This summary represents one wishlist item in the customer's paginated wishlist view. It exposes the saved product together with the item's lifecycle timestamps so clients can render compact wishlist cards without exposing wishlist container internals.
   *
   * The product is returned as a nested product summary, while the item identity and timestamps support list rendering, synchronization, and soft-delete handling.
   */
  export type ISummary = {
    /**
     * The wishlist item identifier.
     *
     * This is the stable primary key for the saved-item row and is used to reference a specific wishlist entry in list-driven workflows.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from mall_platform_wishlist_items.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The saved product entry.
     *
     * This is the product that the customer saved to the wishlist, returned as a nested product summary so clients can render the product name, pricing, seller, category, and thumbnail without another lookup.
     *
     * @x-autobe-database-schema-property product
     * @x-autobe-specification Join mall_platform_wishlist_items.mall_platform_product_id to mall_platform_products.id and expose the related product as IMallPlatformProduct.ISummary. Use the relation object form rather than the scalar foreign key because this is a read summary.
     */
    product: IMallPlatformProduct.ISummary;

    /**
     * The time when the wishlist item was created.
     *
     * This timestamp records when the customer saved the product and supports list ordering and audit display.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from mall_platform_wishlist_items.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The time when the wishlist item was last updated.
     *
     * This timestamp reflects the most recent modification to the wishlist entry and supports synchronization and change tracking.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from mall_platform_wishlist_items.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * The time when the wishlist item was deleted, if it was removed.
     *
     * A null value means the entry is still active. When present, the timestamp indicates the item was soft deleted and should be treated as removed from the customer's visible wishlist.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from mall_platform_wishlist_items.deleted_at. Preserve null when the item is active and include the timestamp when the row has been soft deleted.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
