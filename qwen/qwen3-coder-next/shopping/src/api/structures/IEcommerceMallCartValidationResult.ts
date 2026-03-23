import { tags } from "typia";

export namespace IEcommerceMallCartValidationResult {
  /**
   * Request parameters for cart validation operation. Contains pagination, search, and filtering options to scope which cart items are validated for checkout eligibility.
   */
  export type IRequest = {
    /**
     * Page number for paginated results
     *
     * @x-autobe-specification Pagination parameter - page number for paginated results.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of items per page
     *
     * @x-autobe-specification Pagination parameter - number of items per page.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<100> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Search query for filtering cart items
     *
     * @x-autobe-specification Search parameter - text query for filtering cart items.
     */
    search?: string | undefined;

    /**
     * Additional filter criteria as key-value pairs
     *
     * @x-autobe-specification Filter parameter - JSON object for flexible key-value filtering.
     */
    filters?:
      | {
          [key: string]: string;
        }
      | undefined;
  };

  /**
   * Cart validation result for each cart item showing availability status and failure reasons.
   */
  export type ISummary = {
    /**
     * Unique cart item identifier
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from cart_items.id
     */
    id: string & tags.Format<"uuid">;

    /**
     * Selected product variant identifier
     *
     * @x-autobe-database-schema-property variant_id
     * @x-autobe-specification Direct mapping from cart_items.variant_id
     */
    variant_id: string & tags.Format<"uuid">;

    /**
     * Product identifier derived from cart item's variant
     *
     * @x-autobe-specification Join cart_items.variant_id → product_variants.id → product_variants.product_id
     */
    product_id: string & tags.Format<"uuid">;

    /**
     * Seller identifier derived from cart item's variant
     *
     * @x-autobe-specification Join cart_items.variant_id → product_variants.id → product_variants.seller_id
     */
    seller_id: string & tags.Format<"uuid">;

    /**
     * Number of units in the cart
     *
     * @x-autobe-database-schema-property quantity
     * @x-autobe-specification Direct mapping from cart_items.quantity
     */
    quantity: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Whether the cart item is eligible for checkout
     *
     * @x-autobe-specification Computed by checking variant existence, stock quantity >= cart quantity, and seller not suspended
     */
    is_available: boolean;

    /**
     * List of failure reasons when item is not available
     *
     * @x-autobe-specification Array of failure reason strings computed during validation (e.g., 'Variant no longer exists', 'Insufficient stock', 'Seller is suspended')
     */
    failure_reasons: string[];
  };
}
