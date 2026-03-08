import { tags } from "typia";

import { IPage } from "./IPage";

export namespace IEcommerceMallAuditTrailAnalytic {
  /**
   * Aggregated audit trail analytics summary containing action distributions, admin activity metrics, target entity access patterns, temporal trends, and security flags. This type represents computed statistics from audit log data used for system monitoring and compliance reporting.
   */
  export type ISummary = {
    /**
     * Summary statistics of audit trail analytics including total events, unique admins, and unique entities.
     *
     * @x-autobe-specification Nested IEcommerceMallAuditTrailAnalytic.ISummarySummary object containing aggregated metrics like totalLogs, uniqueAdmins, uniqueEntities, dateRange. Computed via COUNT(*) as totalLogs, COUNT DISTINCT admin_id as uniqueAdmins, COUNT DISTINCT target_entity_type as uniqueEntities from ecommerce_mall_admin_audit_logs.
     */
    summary: IEcommerceMallAuditTrailAnalytic.ISummarySummary;

    /**
     * Distribution of action types performed by administrators, showing count of each action type.
     *
     * @x-autobe-specification Object with action_type keys and integer counts as values. Computed via GROUP BY action_type: SELECT action_type, COUNT(*) FROM ecommerce_mall_admin_audit_logs GROUP BY action_type. Example: {"user_ban": 15, "seller_approve": 23, "category_create": 8}.
     */
    actionTypeDistribution: {
      [key: string]: number & tags.Type<"int32">;
    };

    /**
     * List of administrators with their activity counts, showing which admins performed the most actions.
     *
     * @x-autobe-specification Array of IEcommerceMallAuditTrailAnalytic.IAdminActivity objects. Computed via SELECT admin_id, COUNT(*) as activityCount FROM ecommerce_mall_admin_audit_logs GROUP BY admin_id ORDER BY activityCount DESC. Each object includes admin identifier, activity count, and timestamps.
     */
    adminActivity: IEcommerceMallAuditTrailAnalytic.IAdminActivity[];

    /**
     * Distribution of target entity types affected by admin actions, showing count of actions per entity type.
     *
     * @x-autobe-specification Object with target_entity_type keys and integer counts as values. Computed via GROUP BY target_entity_type: SELECT target_entity_type, COUNT(*) FROM ecommerce_mall_admin_audit_logs WHERE target_entity_type IS NOT NULL GROUP BY target_entity_type. Example: {"ecommerce_mall_sellers": 45, "ecommerce_mall_categories": 12, "ecommerce_mall_admins": 5}.
     */
    targetEntityDistribution: {
      [key: string]: number & tags.Type<"int32">;
    };

    /**
     * Temporal trends showing how admin activity has changed over time windows.
     *
     * @x-autobe-specification Array of IEcommerceMallAuditTrailAnalytic.ITrend objects showing action counts over time windows. Computed via SELECT DATE_TRUNC(timeWindow, created_at) as timeWindow, COUNT(*) as actionCount FROM ecommerce_mall_admin_audit_logs GROUP BY timeWindow ORDER BY timeWindow. Time windows configurable (day, week, month, year).
     */
    trends: IEcommerceMallAuditTrailAnalytic.ITrend[];

    /**
     * Security anomalies detected in audit data, such as unusual admin activity patterns or access violations.
     *
     * @x-autobe-specification Array of IEcommerceMallAuditTrailAnalytic.ISecurityFlag objects flagging unusual patterns. Computed via business logic: flag1 if any single admin has >N bans, flag2 if activity spike >M% in short window, flag3 if admin accessing unrelated entity types. Each flag includes type, severity, and description.
     */
    securityFlags: IEcommerceMallAuditTrailAnalytic.ISecurityFlag[];

    /**
     * Pagination metadata indicating the current page position and total record count.
     *
     * @x-autobe-specification IPage.IPagination object providing pagination metadata for the analytics list response. Includes current page, limit, total records count, and total pages. Standard pagination wrapper for paginated list endpoints.
     */
    pagination: IPage.IPagination;
  };

  /**
   * Filter criteria and configuration for audit trail analytics queries. Allows administrators to retrieve aggregated statistics and insights from audit log data by specifying optional filters for date range, action types, admin users, and target entity types. Supports configurable time window for trend aggregation (day, week, month, or year), sorting options, and pagination control.
   */
  export type IRequest = {
    /**
     * Date range filter for audit logs. Filters records by the created_at timestamp.
     *
     * @x-autobe-specification Named schema containing startDate and endDate date-time values. Filters audit logs by created_at timestamp where created_at >= startDate AND created_at <= endDate. Both values optional; if omitted, no date filtering is applied.
     */
    dateRange?: IEcommerceMallAuditTrailAnalytic.IDateRange | null | undefined;

    /**
     * List of action types to filter by. Only includes audit log entries matching the specified action types.
     *
     * @x-autobe-specification Array of action_type strings from audit logs (e.g., 'user_ban', 'category_create', 'seller_approve'). Filters records where action_type is IN the provided list. If empty or omitted, no action type filtering is applied.
     */
    actionTypes?: string[] | undefined;

    /**
     * List of administrator IDs to filter by. Only includes audit log entries performed by the specified administrators.
     *
     * @x-autobe-specification Array of UUID strings matching admin_id values in audit logs. Filters records where admin_id is IN the provided list. If empty or omitted, no admin filtering is applied.
     */
    adminIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * List of entity types to filter by. Only includes audit log entries targeting the specified entity types.
     *
     * @x-autobe-specification Array of entity type strings (e.g., 'ecommerce_mall_customers', 'ecommerce_mall_sellers', 'ecommerce_mall_categories'). Filters records where target_entity_type is IN the provided list. If empty or omitted, no entity type filtering is applied.
     */
    targetEntityTypes?: string[] | undefined;

    /**
     * Time window for aggregating trend data. Groups results by day, week, month, or year.
     *
     * @x-autobe-specification Determines granularity for temporal trend aggregation: 'day' groups by calendar day, 'week' groups by ISO week, 'month' groups by calendar month, 'year' groups by calendar year. Used for computing trends. If null, trends may be aggregated at finest available granularity.
     */
    timeWindow?: "day" | "week" | "month" | "year" | null | undefined;

    /**
     * Whether to include temporal trend data in the response.
     *
     * @x-autobe-specification Boolean flag indicating whether to include temporal trend data in the response. When true, trends array is populated with date-bucketed counts. When false or null, trends array may be empty or omitted to reduce response size.
     */
    includeTrends?: boolean | null | undefined;

    /**
     * Sort field for results. Options: actionCount, timestamp, adminName, entityType.
     *
     * @x-autobe-specification Determines the sort key for results: 'actionCount' sorts by total action count descending/ascending, 'timestamp' sorts by created_at date-time, 'adminName' sorts by administrator name (requires JOIN), 'entityType' sorts by target_entity_type alphabetically. If null, uses default sort order.
     */
    sortBy?:
      | "actionCount"
      | "timestamp"
      | "adminName"
      | "entityType"
      | null
      | undefined;

    /**
     * Sort order direction. Options: asc (ascending), desc (descending).
     *
     * @x-autobe-specification Determines sort direction: 'asc' for ascending, 'desc' for descending. Combined with sortBy to determine final result ordering. If null, uses default sort direction.
     */
    sortOrder?: "asc" | "desc" | null | undefined;

    /**
     * Current page number for pagination (1-indexed).
     *
     * @x-autobe-specification 1-indexed page number for pagination. Page 1 returns the first page of results. Must be >= 1 if provided. Combined with pageSize or limit to determine which records to return.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /**
     * Maximum number of records to return per page (1-100).
     *
     * @x-autobe-specification Number of records per page. Range: 1 to 100. Default: 50. If omitted or null, defaults to 50. Cannot exceed server-enforced maximum to prevent resource exhaustion.
     */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | null
      | undefined;

    /**
     * Maximum number of records to return total. Controls pagination depth.
     *
     * @x-autobe-specification Maximum total records to return across all pages. When limit is specified and finite, pagination may stop early. If null or omitted, returns results according to page/pageSize until all matching records are retrieved or server-enforced maximum is reached. Defaults to 100 if not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Date range filter criteria for audit trail analytics queries. Defines the temporal boundaries for filtering administrator audit log entries by their creation timestamp. Supports optional start date, optional end date, or both for a complete time window filter.
   */
  export type IDateRange = {
    /**
     * The start date-time for filtering audit logs. Includes logs created on or after this timestamp.
     *
     * @x-autobe-specification Query filter parameter: filters audit logs WHERE created_at >= startDate. When null, no lower bound is applied. Date-time format: ISO 8601 (e.g., '2024-01-15T00:00:00Z'). Used in audit trail analytics and observability dashboard queries.
     */
    startDate?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * The end date-time for filtering audit logs. Includes logs created on or before this timestamp.
     *
     * @x-autobe-specification Query filter parameter: filters audit logs WHERE created_at <= endDate. When null, no upper bound is applied. Date-time format: ISO 8601 (e.g., '2024-01-15T23:59:59Z'). Used in audit trail analytics and observability dashboard queries.
     */
    endDate?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Temporal trend record showing aggregated admin audit activity over a specific time window for analytics and observability dashboards.
   */
  export type ITrend = {
    /**
     * Time period identifier for this trend record (e.g., '2024-03' for March 2024, '2024-W11' for week 11 of 2024). Format depends on aggregation granularity.
     *
     * @x-autobe-specification Computed time window identifier (YYYY-MM for monthly, YYYY-Www for weekly, YYYY-MM-DD for daily, YYYY-Ww for weekly). Format depends on aggregation granularity configured in the analytics query. Used for grouping audit log entries by time period for trend analysis.
     */
    timeWindow: string;

    /**
     * Total number of admin audit log entries recorded within this time window.
     *
     * @x-autobe-specification Computed as COUNT(*) of audit log entries within the time window from ecommerce_mall_admin_audit_logs. Represents total number of admin actions (user management, seller approval, category operations, etc.) performed during this period. Must be >= 0.
     */
    actionCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Start timestamp of the time window (inclusive).
     *
     * @x-autobe-specification Computed from timeWindow boundaries. For monthly '2024-03': dateStart='2024-03-01T00:00:00Z'. For weekly '2024-W11': dateStart=Monday of week 11 at 00:00:00Z. Inclusive start of time window. Format: ISO 8601 date-time (RFC 3339).
     */
    dateStart: string & tags.Format<"date-time">;

    /**
     * End timestamp of the time window (exclusive, i.e., next period start).
     *
     * @x-autobe-specification Computed from timeWindow boundaries. For monthly '2024-03': dateEnd='2024-04-01T00:00:00Z' (next month start). For weekly '2024-W11': dateEnd=Monday of next week at 00:00:00Z. Exclusive end of time window (next period start). Format: ISO 8601 date-time (RFC 3339).
     */
    dateEnd: string & tags.Format<"date-time">;

    /**
     * Distribution of admin actions by type within this period (e.g., {"user_ban": 5, "seller_approve": 12}).
     *
     * @x-autobe-specification Computed via GROUP BY action_type with COUNT(*) from ecommerce_mall_admin_audit_logs within the time window. Object where keys are action types (e.g., 'user_ban', 'seller_approve', 'category_create') and values are counts. Example: {"user_ban": 5, "seller_approve": 12, "category_delete": 3}. Optional field - only included if breakdown requested in query parameters.
     */
    actionTypeBreakdown?:
      | {
          [key: string]: number & tags.Type<"int32">;
        }
      | undefined;

    /**
     * Distribution of actions by target entity type within this period (e.g., {"ecommerce_mall_sellers": 10, "ecommerce_mall_categories": 3}).
     *
     * @x-autobe-specification Computed via GROUP BY target_entity_type with COUNT(*) from ecommerce_mall_admin_audit_logs within the time window. Object where keys are entity types (e.g., 'ecommerce_mall_sellers', 'ecommerce_mall_categories', 'ecommerce_mall_customers') and values are counts. Example: {"ecommerce_mall_sellers": 10, "ecommerce_mall_categories": 3}. Optional field - only included if breakdown requested in query parameters.
     */
    entityBreakdown?:
      | {
          [key: string]: number & tags.Type<"int32">;
        }
      | undefined;
  };

  /**
   * Aggregated audit trail analytics summary showing total audit log entries, distinct administrator activity, affected entity types count, and the temporal range of logged events. This computed DTO represents system-wide audit metrics used for compliance dashboards and security monitoring.
   */
  export type ISummarySummary = {
    /**
     * Total number of audit log entries recorded in the system.
     *
     * @x-autobe-specification COUNT(*) SQL aggregation from ecommerce_mall_admin_audit_logs table. Counts all audit log entries regardless of action type or target entity. Used for system activity monitoring and compliance metrics.
     */
    totalLogs: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Count of distinct administrators who performed actions in the system.
     *
     * @x-autobe-specification COUNT(DISTINCT admin_id) SQL aggregation from ecommerce_mall_admin_audit_logs. Counts unique administrators who performed any audit-loggable action. Used for measuring system access and admin activity coverage.
     */
    uniqueAdmins: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Count of distinct entity types that were targets of admin actions.
     *
     * @x-autobe-specification COUNT(DISTINCT target_entity_type) SQL aggregation from ecommerce_mall_admin_audit_logs WHERE target_entity_type IS NOT NULL. Counts unique entity types (e.g., 'ecommerce_mall_customers', 'ecommerce_mall_sellers', 'ecommerce_mall_products') that were targeted by admin actions. Used for measuring audit scope breadth.
     */
    uniqueEntities: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Temporal range of audit log entries with earliest and latest timestamps.
     *
     * @x-autobe-specification MIN(created_at) and MAX(created_at) SQL aggregation from ecommerce_mall_admin_audit_logs. Captures the earliest and latest audit log timestamps to define the temporal scope of the analytics query. Used for audit period analysis and compliance reporting. MinDate: earliest timestamp. MaxDate: most recent timestamp.
     */
    dateRange: {
      /**
       * Earliest timestamp in audit log entries.
       */
      minDate: string & tags.Format<"date-time">;

      /**
       * Most recent timestamp in audit log entries.
       */
      maxDate: string & tags.Format<"date-time">;
    };
  };

  /**
   * Aggregated activity metrics for a single administrator, showing their total action count and temporal activity range for audit trail monitoring and compliance reporting.
   */
  export type IAdminActivity = {
    /**
     * Unique identifier of the administrator who performed actions.
     *
     * @x-autobe-database-schema-property admin_id
     * @x-autobe-specification Direct mapping from ecommerce_mall_admin_audit_logs.admin_id. UUID format.
     */
    adminId: string & tags.Format<"uuid">;

    /**
     * Total number of actions performed by this administrator.
     *
     * @x-autobe-specification Aggregation via COUNT(*) of all audit log entries for this admin_id. SQL: COUNT(*) FROM ecommerce_mall_admin_audit_logs WHERE admin_id = :adminId.
     */
    activityCount: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Breakdown of action types performed, showing count of each action type.
     *
     * @x-autobe-specification Aggregation via GROUP BY action_type for this admin's actions. Returns object with action_type as key and count as value. SQL: SELECT action_type, COUNT(*) FROM ecommerce_mall_admin_audit_logs WHERE admin_id = :adminId GROUP BY action_type.
     */
    actionTypeDistribution?:
      | {
          [key: string]: number & tags.Type<"int32">;
        }
      | undefined;

    /**
     * Timestamp of the first recorded action by this administrator.
     *
     * @x-autobe-specification Aggregation via MIN(created_at) for this admin's actions. Returns earliest audit log timestamp. SQL: MIN(created_at) FROM ecommerce_mall_admin_audit_logs WHERE admin_id = :adminId.
     */
    firstActivityAt: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent action by this administrator.
     *
     * @x-autobe-specification Aggregation via MAX(created_at) for this admin's actions. Returns latest audit log timestamp. SQL: MAX(created_at) FROM ecommerce_mall_admin_audit_logs WHERE admin_id = :adminId.
     */
    lastActivityAt: string & tags.Format<"date-time">;
  };

  /**
   * Security anomaly flag representing detected suspicious activity patterns in admin audit trails. Used for real-time monitoring of administrator actions, identifying potential security threats, and compliance reporting.
   */
  export type ISecurityFlag = {
    /**
     * Type of security anomaly detected, indicating the category of suspicious activity.
     *
     * @x-autobe-specification Enum of security anomaly types: 'excessive_bans' (admin has >5 bans in 24h), 'unusual_activity_spike' (activity >50% above 7-day average), 'unrelated_entity_access' (accesses 3+ different entity types in 10min), 'brute_force_attempt' (>10 failed logins from same IP in 1h), 'suspicious_login_pattern' (login from new country/location). Computed via business logic monitoring admin activity patterns.
     */
    type:
      | "excessive_bans"
      | "unusual_activity_spike"
      | "unrelated_entity_access"
      | "brute_force_attempt"
      | "suspicious_login_pattern";

    /**
     * Severity level of the security flag, indicating the urgency and impact of the anomaly.
     *
     * @x-autobe-specification Enum of severity levels: 'low' (minor anomaly, informational), 'medium' (moderate concern, requires attention), 'high' (significant threat, immediate action needed), 'critical' (severe security breach, urgent response required). Computed based on threat assessment rules.
     */
    severity: "low" | "medium" | "high" | "critical";

    /**
     * Human-readable description of the security anomaly, explaining what was detected.
     *
     * @x-autobe-specification Human-readable explanation of the detected security anomaly, derived from the flag type and severity. Provides context for what suspicious activity was identified.
     */
    description: string;

    /**
     * Timestamp when the security anomaly was detected.
     *
     * @x-autobe-specification ISO 8601 datetime when the security anomaly was detected by the monitoring system. Computed from the time of pattern detection logic execution.
     */
    timestamp: string & tags.Format<"date-time">;

    /**
     * Additional context and metadata about the security anomaly as a JSON string, varies by flag type.
     *
     * @x-autobe-specification Optional JSON string containing additional context and metadata about the security anomaly. Structure varies by flag type: for 'excessive_bans' includes {admin_id: string, ban_count: integer, threshold: integer}; for 'unusual_activity_spike' includes {activity_count: integer, baseline_avg: integer, percentage_increase: integer}; for 'unrelated_entity_access' includes {accessed_entities: string[], time_window: integer minutes}; for 'brute_force_attempt' includes {ip_address: string, failed_attempts: integer}; for 'suspicious_login_pattern' includes {location: string, country: string}. Computed from analyzed audit trail data and serialized to JSON.
     */
    details?: null | string | undefined;
  };
}
