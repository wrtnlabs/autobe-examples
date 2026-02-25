import { tags } from "typia";

export namespace IShoppingMallCart {
  /**
   * Request body to add a product variant to the customer's shopping cart. The system captures the variant's price and metadata at the moment of addition, ensuring price stability during checkout.
   */
  export type ICreate = {
    /**
     * The unique identifier of the product variant being added to the cart.
     *
     * @x-autobe-database-schema-property variant_id
     * @x-autobe-specification Direct mapping from shopping_mall_cart_items.variant_id. References shopping_mall_product_variants.id.
     */
    variant_id: string & tags.Format<"uuid">;

    /**
     * Number of units of the variant to add to the cart. Must be at least 1 and no more than 50.
     *
     * @x-autobe-database-schema-property quantity
     * @x-autobe-specification Direct mapping from shopping_mall_cart_items.quantity. Must be between 1 and 50 as per requirements.
     */
    quantity: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>;
  };

  /**
   * Filter and pagination parameters for retrieving a customer's shopping cart items with inventory status. Used to specify whether to show only in-stock items and to control the pagination of results.
   */
  export type IRequest = {
    /**
     * When true, only return cart items where the current inventory level is sufficient to fulfill the requested quantity. Helps customers avoid checkout with potentially unavailable items.
     *
     * @x-autobe-specification When true, filters cart items to include only those where quantity <= current variant's stock_quantity (from shopping_mall_product_variant_snapshots). This is a runtime computation, not a stored database field.
     */
    in_stock_only: boolean;

    /**
     * Target page number to retrieve (1-indexed). If omitted, null, or undefined, defaults to page 1. Requesting a page beyond available range returns an empty data array with valid pagination metadata.
     *
     * @x-autobe-specification 1-indexed page number for pagination. Defaults to 1 if null or omitted. Used to retrieve a specific subset of cart items from the paginated result set, with limit defining how many items per page.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page. Controls how many cart items appear in each page of results. Defaults to 100 if not provided.
     *
     * @x-autobe-specification Maximum number of cart items to return per page. Defaults to 100 if null or omitted. Server may enforce upper bounds to prevent resource exhaustion on large requests.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
