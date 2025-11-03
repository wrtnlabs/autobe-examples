import { tags } from "typia";

export namespace IShoppingMallProductSearchIndex {
  /** Search criteria and pagination parameters for product and SKU search. */
  export type IRequest = {
    /** Keyword for searching products and SKUs. Supports partial matches. */
    keyword: string;

    /** Filter by product category IDs. */
    category_ids?: (string & tags.Format<"uuid">)[] | null | undefined;

    /** Minimum price filter. */
    min_price?: number | null | undefined;

    /** Maximum price filter. */
    max_price?: number | null | undefined;

    /** If true, only include products with stock available. */
    in_stock_only?: boolean | null | undefined;

    /** Page number for pagination, defaults to 1. */
    page: number & tags.Type<"int32">;

    /** Page size limit for pagination, defaults to 20. */
    limit: number & tags.Type<"int32">;
  };

  /**
   * Summary representation of entries in the product search index for the
   * shopping mall platform. Provides key identifiers and concatenated search
   * text used in full-text search optimization.
   */
  export type ISummary = {
    /** Unique identifier of the search index entry. */
    id: string & tags.Format<"uuid">;

    /** Foreign key referencing the product. */
    product_id: string & tags.Format<"uuid">;

    /**
     * Foreign key referencing the associated SKU variant, nullable if entry
     * pertains only to the product level.
     */
    sku_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Concatenated searchable text utilized for keyword and attribute
     * searches.
     */
    search_text: string;
  };
}
