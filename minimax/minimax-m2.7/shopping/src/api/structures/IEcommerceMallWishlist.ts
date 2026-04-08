import { tags } from "typia";

import { IEcommerceMallCustomer } from "./IEcommerceMallCustomer";

export namespace IEcommerceMallWishlist {
  /**
   * Summary representation of a customer's wishlist for list displays.
   *
   * Contains essential wishlist information including the wishlist identifier and ownership details. Each registered customer has exactly one wishlist that serves as a container for bookmarked products.
   *
   * **Ownership**: The wishlist belongs to exactly one customer, determined at wishlist creation time during customer registration. The customer relationship provides context for administrative views and customer ownership verification.
   */
  export type ISummary = {
    /**
     * Unique identifier of the wishlist.
     *
     * System-generated UUID that uniquely identifies this wishlist record. Each customer has exactly one wishlist, making this identifier directly tied to the customer account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_wishlists.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the wishlist was created.
     *
     * Records when the customer registered on the platform, as wishlists are automatically created during customer registration.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_wishlists.created_at. Timestamptz stored in UTC.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the wishlist was last modified.
     *
     * Reflects the last time any item was added to or removed from the wishlist. Used for cache invalidation and displaying freshness indicators.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_wishlists.updated_at. Timestamptz stored in UTC.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * The customer who owns this wishlist.
     *
     * Reference to the customer account that owns this wishlist. Each wishlist belongs to exactly one customer, providing ownership context in administrative and customer-facing views.
     *
     * @x-autobe-database-schema-property customer
     * @x-autobe-specification JOIN via ecommerce_mall_wishlists.shopping_customer_id to ecommerce_mall_customers.id. Returns IEcommerceMallCustomer.ISummary.
     */
    customer: IEcommerceMallCustomer.ISummary;
  };
}
