import { tags } from "typia";

import { IEcommerceMallProduct } from "./IEcommerceMallProduct";
import { IEcommerceMallWishlist } from "./IEcommerceMallWishlist";

export namespace IEcommerceMallWishlistItem {
  /**
   * Request body for adding a product to the authenticated customer's wishlist. Contains only the product identifier of the product to bookmark.
   */
  export type ICreate = {
    /**
     * UUID identifier of the product to add to the customer's wishlist.
     *
     * @x-autobe-database-schema-property ecommerce_mall_product_id
     * @x-autobe-specification Maps productId to ecommerce_mall_product_id column. Validates product exists and is not soft-deleted (deleted_at IS NULL). Enforced unique constraint per wishlist (one product per wishlist).
     */
    productId: string & tags.Format<"uuid">;
  };

  /**
   * Wishlist item with parent wishlist context and product summary. Used as response for adding a product to customer's wishlist.
   */
  export type IInvert = {
    /**
     * Unique identifier of the wishlist item.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_wishlist_items.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the item was added to the wishlist.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_wishlist_items.created_at. Timestamp when item was added to wishlist.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Product summary for the bookmarked product.
     *
     * @x-autobe-database-schema-property product
     * @x-autobe-specification Join via ecommerce_mall_product_id FK. Returns IEcommerceMallProduct.ISummary with current product state (name, price, category, thumbnail, stock status, ratings).
     */
    product: IEcommerceMallProduct.ISummary;

    /**
     * Parent wishlist context containing the customer information.
     *
     * @x-autobe-database-schema-property wishlist
     * @x-autobe-specification Join via ecommerce_mall_wishlist_id FK. Returns IEcommerceMallWishlist.ISummary with parent wishlist context and customer information.
     */
    wishlist: IEcommerceMallWishlist.ISummary;
  };

  /**
   * Summary representation of a wishlist item linking to a product with essential product details for display.
   */
  export type ISummary = {
    /**
     * Timestamp when the item was added to the wishlist.
     */
    createdAt: string & tags.Format<"date-time">;
  };
}
