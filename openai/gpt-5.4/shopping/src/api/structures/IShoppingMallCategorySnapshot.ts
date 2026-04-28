import { tags } from "typia";

import { IShoppingMallCategory } from "./IShoppingMallCategory";

export namespace IShoppingMallCategorySnapshot {
  /**
   * Search, filter, sorting, and pagination options for retrieving the historical snapshot list of a specific catalog category in the administrator API.
   */
  export type IRequest = {
    /**
     * Text keyword used to search snapshot change summaries for the selected category.
     *
         * @x-autobe-specification Optional free-text query parameter from the
         *   request body. When provided, apply it as text search against
         *   shopping_mall_category_snapshots.change_summary within the category
         *   already scoped by the categoryId path parameter.
     */
    search?: string | undefined;

    /**
     * Sort order for the category snapshot list by creation time.
     *
         * @x-autobe-specification Optional request-body sort selector for
         *   chronological ordering of the snapshot query. Accept only
         *   created_at.asc or created_at.desc and translate the selected value
         *   into ORDER BY shopping_mall_category_snapshots.created_at ASC or
         *   DESC for rows already filtered by categoryId. Default to
         *   created_at.desc when omitted.
     */
    sort?: "created_at.asc" | "created_at.desc" | undefined;

    /**
     * Page number of the snapshot results to retrieve.
     *
         * @x-autobe-specification Optional 1-indexed page number from the
         *   request body used to calculate the result offset for the paginated
         *   snapshot query. This value does not map to any database field and
         *   must only affect pagination windowing of the filtered result set.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of snapshot records to include in one response page.
     *
         * @x-autobe-specification Optional maximum number of snapshot records
         *   to return in one page. Enforce the schema bounds, use it to set the
         *   page size for the filtered shopping_mall_category_snapshots query,
         *   and do not map it to any database column.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Start of the creation-time range used to filter category snapshots.
     *
         * @x-autobe-specification Optional lower datetime boundary from the
         *   request body. When provided, restrict the scoped
         *   shopping_mall_category_snapshots query to rows whose created_at is
         *   greater than or equal to this timestamp.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of the creation-time range used to filter category snapshots.
     *
         * @x-autobe-specification Optional upper datetime boundary from the
         *   request body. When provided, restrict the scoped
         *   shopping_mall_category_snapshots query to rows whose created_at is
         *   less than or equal to this timestamp.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Summary representation of a historical category snapshot used in paginated audit history responses. It gives clients the snapshot identifier, a human-readable change summary, the related category in compact form, and the snapshot timestamps without including the larger before-and-after audit text fields.
   */
  export type ISummary = {
    /**
     * Unique identifier of this category snapshot record.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_category_snapshots.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Short human-readable summary of the category change recorded in this snapshot.
     *
         * @x-autobe-database-schema-property change_summary
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_category_snapshots.change_summary. Stores the
         *   human-readable summary of the category change captured by this
         *   snapshot.
     */
    change_summary: string;

    /**
     * Compact summary of the category to which this historical snapshot belongs.
     *
         * @x-autobe-database-schema-property category
         * @x-autobe-specification Resolve the
         *   shopping_mall_category_snapshots.category relation by joining
         *   shopping_mall_category_snapshots.shopping_mall_category_id to
         *   shopping_mall_categories.id, and serialize the related row as
         *   IShoppingMallCategory.ISummary.
     */
    category: IShoppingMallCategory.ISummary;

    /**
     * Timestamp when this snapshot record was created.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_category_snapshots.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * System-maintained timestamp associated with the latest persisted state of this snapshot record.
     *
         * @x-autobe-database-schema-property updated_at
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_category_snapshots.updated_at. Although snapshot rows
         *   are append-only in business behavior, this timestamp is maintained
         *   for platform-wide structural consistency.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft-deletion timestamp of this snapshot record, or null when the snapshot remains active in storage.
     *
         * @x-autobe-database-schema-property deleted_at
         * @x-autobe-specification Direct mapping from
         *   shopping_mall_category_snapshots.deleted_at. This value is normally
         *   null because snapshot rows are expected to remain undeleted; when
         *   present, it indicates soft deletion.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
