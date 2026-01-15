import { tags } from "typia";

export namespace ICommunityPlatformSystemAlerts {
  /**
   * Search criteria and pagination parameters for filtering system alerts.
   *
   * This request object defines parameters for retrieving filtered and
   * paginated system alerts from the community_platform_system_alerts table.
   *
   * The schema supports comprehensive searching capabilities for
   * system-generated notifications and critical incidents across the
   * platform. Administrators can filter alerts by severity level, creation
   * date range, and affected entity type. The results are paginated with
   * configurable page sizes, supporting efficient traversal through large
   * volumes of system monitoring data.
   *
   * All parameters are optional to allow flexible querying patterns. When
   * parameters are omitted, the system returns the most recent alerts based
   * on default sorting.
   *
   * The request structure is designed to support both human operators viewing
   * the alert dashboard and automated monitoring systems that consume the
   * endpoint for incident response workflows.
   */
  export type IRequest = {
    /**
     * The page number for pagination. Must be a positive integer. Defaults
     * to 1 when omitted.
     *
     * This parameter controls which page of results to return when dealing
     * with large volumes of system alerts. Each page contains a fixed
     * number of items as specified by the limit parameter.
     *
     * For example, when page=2 and limit=50, the system returns alerts
     * 51-100.
     *
     * Constraint: Must be greater than or equal to 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * The number of alerts to return per page. Must be between 1 and 100
     * inclusive. Defaults to 25 when omitted.
     *
     * This parameter controls the pagination size, allowing efficient data
     * retrieval. Smaller limits reduce response size for lower-bandwidth
     * environments, while larger limits reduce the number of round trips
     * needed for bulk data retrieval.
     *
     * Constraint: Must be between 1 and 100 inclusive.
     *
     * - Minimum: 1 (at least one alert must be returned)
     * - Maximum: 100 (prevents overly large responses that could impact
     *   system performance)
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter alerts by severity level. Must be one of the following values:
     *
     * - 'critical': System-wide failures, data loss, or security breaches
     * - 'high': Major service degradation or performance issues
     * - 'medium': Minor service issues or configuration warnings
     * - 'low': Informational events or non-essential monitoring data
     *
     * Omit to include all severities.
     *
     * Severity levels categorize system alerts by their impact on platform
     * stability and user experience. This filter allows administrators to
     * focus on the most critical issues first.
     */
    severity?: "critical" | "high" | "medium" | "low" | undefined;

    /**
     * Filter alerts created on or after this datetime in ISO 8601 format.
     * Omit to include all historical alerts.
     *
     * This parameter allows users to retrieve alerts from a specific date
     * range, focusing on recent events or investigating specific time
     * periods.
     *
     * Format specification:
     *
     * - Must follow ISO 8601 date-time format (YYYY-MM-DDTHH:mm:ssZ)
     * - Example: "2024-12-01T08:30:00Z"
     * - When omitted, no lower bound is applied
     */
    created_at_start?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter alerts created on or before this datetime in ISO 8601 format.
     * Omit to include all future alerts.
     *
     * This parameter allows users to restrict results to a specific end
     * date, useful for time-bound investigations or reporting.
     *
     * Format specification:
     *
     * - Must follow ISO 8601 date-time format (YYYY-MM-DDTHH:mm:ssZ)
     * - Example: "2024-12-01T17:45:00Z"
     * - When omitted, no upper bound is applied
     */
    created_at_end?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter alerts by the type of entity affected. Must be one of the
     * following values:
     *
     * - 'user': Alerts related to user accounts, authentication, or activity
     * - 'product': Alerts related to product catalog, pricing, or inventory
     * - 'inventory': Alerts related to warehouse stock levels and movements
     * - 'system': Platform-wide infrastructure or service health alerts
     * - 'shipment': Alerts related to delivery logistics and carrier
     *   performance
     * - 'payment': Alerts related to transaction processing and financial
     *   systems
     *
     * Omit to include all entity types.
     *
     * This parameter allows administrators to focus on alerts related to
     * specific system components or business domains, reducing noise from
     * unrelated system events.
     */
    affected_entity_type?:
      | "user"
      | "product"
      | "inventory"
      | "system"
      | "shipment"
      | "payment"
      | undefined;
  };

  /**
   * Summary representation of system alerts for administrative monitoring and
   * reporting.
   *
   * The ICommunityPlatformSystemAlerts.ISummary schema provides a lightweight
   * view of critical system events and anomalies, enabling administrators to
   * quickly assess platform status and take appropriate actions. This schema
   * excludes detailed diagnostic information and full event context to
   * optimize performance for list views and dashboard displays.
   *
   * Each alert represents a system-generated notification triggered by
   * business logic rules, performance thresholds, or operational events. The
   * summary includes essential metadata for triage and prioritization without
   * the full diagnostic payload.
   *
   * Used in administrative dashboards and notification feeds where
   * high-volume alert viewing is required. The full alert details can be
   * retrieved by accessing individual alert records via their unique IDs.
   *
   * This schema directly corresponds to the community_platform_system_alerts
   * table in the database and serves as the primary interface for system
   * health monitoring.
   */
  export type ISummary = {
    /**
     * Unique identifier for the system alert.
     *
     * A UUIDv4 generated by the system upon alert creation. This identifier
     * is immutable and serves as the primary key for the alert record in
     * the database.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The severity level of the system alert, indicating its operational
     * impact.
     *
     * This field categorizes alerts for prioritization and response
     * routing:
     *
     * - 'low': Minor issue with minimal user impact. Requires monitoring but
     *   no immediate action.
     * - 'medium': Noticeable issue affecting some users or system components.
     *   Requires assessment within 24 hours.
     * - 'high': Critical issue requiring immediate attention. Requires
     *   investigation and resolution within 2 hours.
     * - 'critical': System-wide failure or security breach. Requires
     *   immediate response from senior operations team and escalation to
     *   management.
     *
     * This classification drives the alert routing, notification intensity,
     * and interface presentation in admin dashboards.
     */
    severity: "low" | "medium" | "high" | "critical";

    /**
     * Category or classification of the system alert based on the
     * triggering mechanism.
     *
     * This field enables administrators to filter and group alerts by their
     * root cause or origin:
     *
     * - 'system_health': General platform performance degradation, memory
     *   pressure, CPU overload, or network latency issues
     * - 'security_event': Suspicious activity or potential breach attempts,
     *   unauthorized access attempts, or security policy violations
     * - 'resource_exhaustion': Critical system resources approaching limits
     *   such as disk space, database connections, or API rate limits
     * - 'data_integrity': Database consistency issues, failed validations, or
     *   data corruption events
     * - 'external_integration': Failure in external service connections such
     *   as payment processors, delivery APIs, or third-party authentication
     *   services
     * - 'user_activity': Abnormal user behavior patterns like rapid-fire
     *   requests, credential stuffing attempts, or automated scraping
     * - 'notification_delivery': System-wide notification delivery failures
     *   affecting email, push, or SMS channels
     * - 'maintenance': Scheduled system maintenance windows or planned
     *   outages
     *
     * This categorization helps teams quickly identify patterns across
     * similar alert types and prioritize response actions effectively.
     */
    type:
      | "system_health"
      | "security_event"
      | "resource_exhaustion"
      | "data_integrity"
      | "external_integration"
      | "user_activity"
      | "notification_delivery"
      | "maintenance";

    /**
     * Brief human-readable description of the alert event.
     *
     * Contains a concise, actionable summary of what occurred in natural
     * language, excluding detailed technical specifications that would be
     * in the full event context. This message is designed for immediate
     * comprehension by operations staff viewing alert dashboards.
     *
     * The message provides context about the nature of the issue, the
     * affected system component, and any immediate action required, without
     * exposing implementation specifics or error codes that could be
     * overwhelming in a summary view.
     */
    message: string;

    /**
     * Type of system entity impacted by this alert, if applicable.
     *
     * Specifies which component or service was affected by the occurrence,
     * enabling targeted response and root cause analysis.
     *
     * Common values include:
     *
     * - 'user_sessions': Authentication or session management systems
     * - 'content_delivery': CDN or media delivery infrastructure
     * - 'payment_processing': Financial transaction systems
     * - 'search_service': Search indexing or retrieval functionality
     * - 'database': Core database performance or availability
     * - 'notification_engine': Notification delivery systems
     * - 'inventory_system': Product inventory and stock management
     * - 'shipping_service': Logistics and delivery systems
     * - 'api_gateway': Public API endpoint availability
     * - 'analytics_engine': Data reporting and analytics components
     * - 'cache_system': Distributed caching infrastructure
     * - 'queue_system': Message queue or background job processing systems
     *
     * An empty or null value indicates the alert affects the platform as a
     * whole without targeting a specific subsystem.
     */
    affected_entity_type: string;

    /**
     * Timestamp when the system alert was generated and recorded in the
     * system.
     *
     * Follows ISO 8601 date-time format with timezone information to ensure
     * consistent temporal tracking across distributed systems. This field
     * reflects the exact moment when the system detected the event that
     * triggered the alert.
     *
     * This timestamp serves as the primary chronological reference for
     * alert correlation, performance analysis, and response SLA
     * calculations. Times are stored in UTC for global consistency.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
