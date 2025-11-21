import { tags } from "typia";

import { IShoppingMallProduct } from "./IShoppingMallProduct";

export namespace IShoppingMallWishlistItem {
  /**
   * Summary view of wishlist item for display in wishlist summaries and quick
   * reference scenarios.
   *
   * Provides essential item information including the product reference,
   * variant details, and addition timestamp for efficient display in wishlist
   * interfaces. The summary format optimizes performance while maintaining
   * sufficient context for user decision-making.
   *
   * Used in wishlist listings, customer dashboards, and quick reference
   * scenarios where full wishlist item details are not required. Supports
   * customer wishlist management by providing key product information and
   * addition context.
   *
   * Maintains relationships with product catalog for accurate product
   * representation and supports variant-specific wishlist items when
   * customers select specific product variations.
   */
  export type ISummary = {
    /**
     * Unique wishlist item identifier for reference and management
     * operations. Used as the primary key for wishlist item updates,
     * deletions, and detailed retrievals.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Product reference containing essential product information for
     * wishlist item context. Includes product name, pricing, and seller
     * details for customer reference.
     */
    product: IShoppingMallProduct.ISummary;

    /**
     * Specific product variant identifier when the wishlist item references
     * a particular product variation. Nullable for products without
     * variants or when variant selection is not applicable.
     */
    product_variant_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Desired quantity of the product in the wishlist. Defaults to 1 and
     * supports bulk wishlist additions for future purchases.
     */
    quantity?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Timestamp when the item was added to the wishlist. Used for sorting
     * and organizing wishlist items by addition date.
     */
    added_at: string & tags.Format<"date-time">;

    /**
     * Customer notes or reminders associated with the wishlist item.
     * Optional field for personal wishlist management and purchase
     * planning.
     */
    notes?: string | undefined;
  };
}
