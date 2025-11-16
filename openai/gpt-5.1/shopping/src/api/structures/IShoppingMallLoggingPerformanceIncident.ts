import { tags } from "typia";

export namespace IShoppingMallLoggingPerformanceIncident {
  /**
   * Search criteria, filters, and pagination parameters for querying
   * performance incident reports from ShoppingMall logging tables.
   *
   * Represents complex filters over logging-oriented Prisma models such as
   * shopping_mall_error_logs, shopping_mall_access_logs, and
   * shopping_mall_integration_event_logs to retrieve performance-related
   * incidents like slow responses, timeouts, elevated error rates, and
   * similar operational issues.
   */
  export type IRequest = {
    /**
     * Inclusive start of the time window for performance incidents to
     * retrieve, expressed as an ISO 8601 UTC date-time string.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Exclusive end of the time window for performance incidents to
     * retrieve, expressed as an ISO 8601 UTC date-time string.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional list of performance incident types to include in the result,
     * such as slowResponse, timeout, errorSpike, or resourceSaturation.
     */
    incidentTypes?: string[] | undefined;

    /**
     * Optional list of severity levels for performance incidents, such as
     * info, warning, or critical.
     */
    severities?: string[] | undefined;

    /**
     * Optional list of service or subsystem identifiers to filter incidents
     * to specific parts of the platform.
     */
    serviceNames?: string[] | undefined;

    /**
     * Optional list of HTTP endpoint paths or route patterns to filter
     * incidents related to specific APIs or web pages.
     */
    endpointPaths?: string[] | undefined;

    /**
     * Lower bound on request or operation duration in milliseconds used to
     * focus on particularly slow incidents.
     */
    minDurationMs?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Upper bound on request or operation duration in milliseconds used to
     * limit results to specific latency ranges.
     */
    maxDurationMs?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Free-text search string applied to incident summaries or diagnostic
     * messages.
     */
    search?: (string & tags.MaxLength<512>) | undefined;

    /**
     * 1-based page index for pagination of performance incidents. Defaults
     * to the first page when omitted.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of performance incident summaries to return in a
     * single page. Implementations may enforce an upper bound for safety.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Field name to sort performance incidents by, commonly occurredAt,
     * durationMs, or severity.
     */
    orderBy?: string | undefined;

    /**
     * Sort direction for performance incidents, either asc for ascending or
     * desc for descending.
     */
    orderDirection?: string | undefined;
  };

  /**
   * Summary representation of a performance-related incident detected by the
   * shopping mall logging and monitoring subsystem.
   *
   * Used primarily in admin dashboards, alerts, and correlation views where
   * operators need to quickly understand which component, endpoint, or
   * integration is experiencing latency, error-rate spikes, or other
   * performance problems without loading full incident detail payloads.
   */
  export type ISummary = {
    /** Unique identifier of the performance incident record. */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the monitoring system detected or first registered the
     * performance incident.
     *
     * Expressed in ISO 8601 date-time format with timezone information.
     */
    detected_at: string & tags.Format<"date-time">;

    /**
     * Severity level of the incident as classified by the monitoring
     * system.
     *
     * Typical values include `info`, `warning`, `minor`, `major`,
     * `critical`. Implementations may define stricter enums in code to
     * match alerting policies.
     */
    severity: string & tags.MinLength<1>;

    /**
     * High-level performance category describing the nature of the
     * incident.
     *
     * Examples: `latency`, `error-rate`, `throughput`, `saturation`,
     * `resource-exhaustion`.
     *
     * This field is used to group incidents in dashboards and to drive
     * routing to the appropriate on-call teams.
     */
    category: string & tags.MinLength<1>;

    /**
     * Type of source that generated or is affected by the incident.
     *
     * Typical examples: `api-endpoint`, `background-job`, `integration`,
     * `database`, `cache`, `queue`.
     *
     * This field is useful to narrow down which subsystem is degraded.
     */
    source_type: string & tags.MinLength<1>;

    /**
     * Identifier of the affected source within the specified source type.
     *
     * For example, an API route path (`/orders/{orderId}`), job name
     * (`recalculate-seller-metrics`), integration key
     * (`payment-gateway:stripe`), or database query group name.
     */
    source_identifier: string & tags.MinLength<1>;

    /**
     * Name of the primary metric that triggered the incident.
     *
     * Examples: `p95_latency_ms`, `error_rate`, `throughput_rps`,
     * `queue_lag_seconds`, `cpu_usage_percent`.
     */
    metric_name: string & tags.MinLength<1>;

    /**
     * Current measured value of the primary metric at the time the incident
     * was detected.
     *
     * For latency metrics this is typically milliseconds; for error rates
     * usually a fraction or percentage; for throughput a rate per second or
     * minute.
     */
    current_value: number;

    /**
     * Configured threshold value that the metric exceeded (or fell below)
     * to trigger the incident.
     *
     * This allows operators to see how far out of bounds the metric is and
     * supports SLA/SLO analysis.
     */
    threshold_value: number;

    /**
     * Measurement unit of the metric values.
     *
     * Examples: `ms`, `seconds`, `percent`, `rps`, `ops`, `count`, `bytes`.
     * This field is intended for display in dashboards and reports.
     */
    unit: string & tags.MinLength<1>;

    /**
     * Current lifecycle status of the incident.
     *
     * Examples: `open`, `acknowledged`, `mitigated`, `resolved`, `closed`.
     * Implementations may enforce a stricter enum and workflow at the
     * service level.
     */
    status: string & tags.MinLength<1>;

    /**
     * Correlation identifier shared with other logs and traces that are
     * related to this incident, such as integration events, access logs, or
     * error logs.
     *
     * Typically a trace ID, request ID, or an incident group key used for
     * cross-system observability.
     */
    correlation_id?: (string & tags.MinLength<1>) | undefined;
  };
}
