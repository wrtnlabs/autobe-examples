import { tags } from "typia";

export namespace IShoppingMallShoppingMallSku {
  /** Request schema for searching and filtering SKUs with pagination. */
  export type IRequest = {
    /** Product ID to which SKUs belong. Filter SKUs for the given product. */
    shopping_mall_product_id?: (string & tags.Format<"uuid">) | undefined;

    /** SKU code within the product for filtering or searching. */
    sku_code?: string | undefined;

    /** Lifecycle state filter for SKUs, such as Draft, Active, Inactive. */
    status?: string | undefined;

    /** Minimum price filter for SKUs. */
    min_price?: number | undefined;

    /** Maximum price filter for SKUs. */
    max_price?: number | undefined;

    /** Page number for pagination. */
    page?: (number & tags.Type<"int32">) | undefined;

    /** Number of items per page. */
    limit?: (number & tags.Type<"int32">) | undefined;
  };

  /**
   * Summary type for shopping mall SKU entity with key details for listing
   * and display.
   *
   * Contains SKU code, price, status, and unique identifier.
   *
   * Excludes weight and inventory to focus on main listing attributes.
   */
  export type ISummary = {
    /** Unique identifier of the SKU entity. */
    id: string & tags.Format<"uuid">;

    /** Unique SKU code within the product. */
    sku_code: string;

    /** Retail price of this SKU. */
    price: number;

    /** Lifecycle state of the SKU, e.g., Draft, Active, Inactive. */
    status: string;
  };
}
