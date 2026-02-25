import { tags } from "typia";

export namespace IEcommerceCategory {
  /**
   * A condensed representation of a category, showing key details like name, description, and parent category for display in lists. Excludes detailed composition and child categories to optimize for list performance.
   */
  export type ISummary = {
    /**
     * Unique category identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_categories.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Category name (e.g., 'Electronics').
     *
     * @x-autobe-database-schema-property name
     * @x-autobe-specification Direct mapping from ecommerce_categories.name.
     */
    name: string;

    /**
     * Category description (e.g., 'All electronic devices and accessories').
     *
     * @x-autobe-database-schema-property description
     * @x-autobe-specification Direct mapping from ecommerce_categories.description.
     */
    description?: string | null | undefined;

    /**
     * Parent category reference (for hierarchical organization).
     *
     * @x-autobe-database-schema-property parent
     * @x-autobe-specification Join via parent_id (ecommerce_categories.parent_id) to get parent category as object.
     */
    parent?: IEcommerceCategory.ISummary | null | undefined;

    /**
     * Timestamp when category was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_categories.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when category was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from ecommerce_categories.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Query parameters for filtering product categories, including search term, category ID filter, and pagination settings.
   */
  export type IRequest = {
    /**
     * Search term for category name matching. Supports partial matches and is case-insensitive
     *
     * @x-autobe-database-schema-property name
     * @x-autobe-specification Search across category names (case-insensitive) using LIKE operator
     */
    search?: string | undefined;

    /**
     * ID of category to include in category list. Filter results to specific category.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Matches category ID using exact string comparison
     */
    category_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Page number for paginated results. Defaults to 1 if not provided
     *
     * @x-autobe-specification Current page number (1-indexed). Default: 1. Must be >= 1
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page. Valid range: 1-100. Defaults to 12 if not provided
     *
     * @x-autobe-specification Number of items per page. Valid range: 1-100. Default: 12
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
