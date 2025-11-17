import { tags } from "typia";

export namespace IShoppingMallCategory {
  /**
   * Request DTO to retrieve a filtered and paginated list of shopping mall
   * categories.
   *
   * Supports parameters for filtering categories by name, status, and
   * creation date range. Allows clients to specify pagination controls such
   * as page number and page size. Facilitates advanced search operations with
   * flexible query fields.
   *
   * Security policies enforce rate limiting and data visibility restrictions
   * based on user roles.
   */
  export type IRequest = {
    /** Page number for paginated results. Must be 1 or higher. */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of categories returned per page. Must be between 1 and
     * 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /** Search keyword to filter categories by name or description. */
    search?: string | undefined;

    /**
     * Filter categories by status. Typical values include 'active' or
     * 'inactive'.
     */
    status?: string | undefined;

    /**
     * Start of date range for filtering categories by creation date.
     * Inclusive. Can be null to omit lower bound.
     */
    created_at_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * End of date range for filtering categories by creation date.
     * Inclusive. Can be null to omit upper bound.
     */
    created_at_to?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Summary data for a product category in the shopping mall.
   *
   * This schema provides a lightweight representation of the category entity,
   * intended for use in lists, references, and embedding contexts. It
   * includes core identifying information and status, without large
   * descriptive fields.
   *
   * Timestamps are also included to track creation and last update times,
   * along with soft deletion status to indicate archival state.
   *
   * It is derived from the shopping_mall_categories table and excludes excess
   * verbose details for concise presentation.
   */
  export type ISummary = {
    /** Unique identifier of the category. */
    id: string & tags.Format<"uuid">;

    /** Name of the product category for display and filtering. */
    name: string;

    /** Current activation status of the category. */
    status: string;

    /**
     * Optional detailed description of the category providing additional
     * context and business insights.
     */
    description?: string | undefined;

    /** Timestamp when the category was created. */
    created_at?: (string & tags.Format<"date-time">) | undefined;

    /** Timestamp when the category was last updated. */
    updated_at?: (string & tags.Format<"date-time">) | undefined;

    /** Timestamp marking soft deletion; null means the category is active. */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
