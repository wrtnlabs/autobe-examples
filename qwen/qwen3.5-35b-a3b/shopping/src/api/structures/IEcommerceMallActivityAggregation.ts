import { tags } from "typia";

export namespace IEcommerceMallActivityAggregation {
  /**
   * Query parameters for retrieving aggregated activity statistics with filtering, grouping, and pagination capabilities.
   */
  export type IRequest = {
    /**
     * Page number for paginated results (1-indexed).
     *
     * @x-autobe-specification Page number for pagination. Defaults to 1. Must be >= 1. Controls OFFSET calculation: (page - 1) * limit.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of records per page (1-100).
     *
     * @x-autobe-specification Maximum number of records per page. Range: 1-100. Controls page size for pagination.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Start date for filtering activities (inclusive).
     *
     * @x-autobe-specification Optional date range start filter. Activities with created_at >= from will be included. ISO 8601 datetime format.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering activities (inclusive).
     *
     * @x-autobe-specification Optional date range end filter. Activities with created_at <= to will be included. ISO 8601 datetime format.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by actor types (customer, seller, admin, super_admin).
     *
     * @x-autobe-specification Filter activities by actor type. Values: customer, seller, admin, super_admin. Multiple values supported via IN clause.
     */
    actor_types?:
      | ("customer" | "seller" | "admin" | "super_admin")[]
      | undefined;

    /**
     * Filter by entity types affected by activities.
     *
     * @x-autobe-specification Filter activities by entity type. Examples: order, product, review, shipment, category, etc. Supports multiple values via IN clause.
     */
    entity_types?: string[] | undefined;

    /**
     * Filter by action types performed (created, updated, deleted, etc.).
     *
     * @x-autobe-specification Filter activities by action type. Examples: created, updated, deleted, approved, rejected, etc. Supports multiple values via IN clause.
     */
    action_types?: string[] | undefined;

    /**
     * Group aggregation results by these dimensions (actor_type, entity_type, action_type, date).
     *
     * @x-autobe-specification Dimensions to GROUP BY for aggregation. Options: actor_type, entity_type, action_type, date. Multiple dimensions supported. Date grouping uses DATE(created_at).
     */
    group_by?:
      | ("actor_type" | "entity_type" | "action_type" | "date")[]
      | undefined;

    /**
     * Field to sort aggregation results by (count, actor_type, entity_type, action_type, date).
     *
     * @x-autobe-specification Field to sort results by. Options: count (aggregation count), actor_type, entity_type, action_type, date. Uses ORDER BY clause.
     */
    sort_by?:
      | "count"
      | "actor_type"
      | "entity_type"
      | "action_type"
      | "date"
      | undefined;

    /**
     * Sort order direction (asc or desc).
     *
     * @x-autobe-specification Sort order direction. Options: asc (ascending), desc (descending). Used with sort_by field.
     */
    sort_order?: "asc" | "desc" | undefined;
  };

  /**
   * Aggregated activity statistics for platform-wide monitoring. Groups activity logs by actor type, entity type, and action type to provide summary counts and timestamps for audit oversight.
   */
  export type ISummary = {
    /**
     * Type of actor who performed the action: customer, seller, admin, or super_admin.
     *
     * @x-autobe-specification GROUP BY actor_type from ecommerce_mall_activity_logs. Returns actor type categorization string from actor_type column.
     */
    actor_type: string;

    /**
     * Type of entity that was affected by the action: order, product, review, shipment, etc.
     *
     * @x-autobe-specification GROUP BY entity_type from ecommerce_mall_activity_logs. Returns entity type categorization string from entity_type column.
     */
    entity_type: string;

    /**
     * Type of action performed: created, updated, deleted, approved, rejected, etc.
     *
     * @x-autobe-specification GROUP BY action_type from ecommerce_mall_activity_logs. Returns action type categorization string from action_type column.
     */
    action_type: string;

    /**
     * Count of activity log entries matching this actor_type, entity_type, and action_type combination.
     *
     * @x-autobe-specification Computed: COUNT(*) from ecommerce_mall_activity_logs grouped by actor_type, entity_type, action_type. Returns aggregate count of log entries per group.
     */
    count: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Timestamp of the earliest activity log entry in this group.
     *
     * @x-autobe-specification Computed: MIN(created_at) from ecommerce_mall_activity_logs grouped by actor_type, entity_type, action_type. Returns earliest timestamp in each aggregation group.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
