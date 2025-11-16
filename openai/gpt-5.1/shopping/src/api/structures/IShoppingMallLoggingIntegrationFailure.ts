import { tags } from "typia";

export namespace IShoppingMallLoggingIntegrationFailure {
  /**
   * Search criteria, filters, and pagination parameters for querying
   * integration failure incident reports from ShoppingMall integration event
   * and logging tables.
   *
   * This DTO is used by platform administrators to filter integration failure
   * logs across external providers such as payment gateways, shipping
   * carriers, notification services, and other third‑party systems. It
   * supports time‑window filtering, provider and integration‑type scoping,
   * failure categorization, severity selection, and pagination/sorting
   * options for analytical dashboards.
   */
  export type IRequest = {
    /**
     * 1‑based page index for paginated result navigation.
     *
     * Defaults to the first page when omitted. Platform implementations
     * typically cap the maximum page value based on data volume.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of incident summaries to return per page.
     *
     * Backends should enforce an upper bound (for example 50–200) to
     * protect the logging storage from unbounded scans and overly large
     * responses.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>)
      | undefined;

    /**
     * Start of the time window (inclusive) for filtering integration
     * failures.
     *
     * Must be an ISO 8601 timestamp. When omitted, the system may use a
     * default look‑back window such as the last 24 or 72 hours.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of the time window (exclusive) for filtering integration
     * failures.
     *
     * Must be an ISO 8601 timestamp that is not earlier than the `from`
     * value. When omitted, defaults to the current time on the server.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter set of integration types to include in the result.
     *
     * When provided, only failures from the specified integration type
     * identifiers will be returned.
     */
    integrationTypes?: string[] | undefined;

    /**
     * List of external partner identifiers to filter on.
     *
     * If specified, only incidents associated with these partners are
     * included.
     */
    partnerIdentifiers?: string[] | undefined;

    /**
     * Filter by one or more failure categories that describe the nature of
     * the incident.
     *
     * When omitted, all failure categories are considered.
     */
    failureCategories?:
      | (
          | "timeout"
          | "invalid_response"
          | "authentication_error"
          | "throttling"
          | "transport_error"
          | "internal_mapping_error"
          | "unknown"
        )[]
      | undefined;

    /**
     * Filter set of severity levels for integration incidents to include.
     *
     * Combining with time‑window filters allows administrators to focus on
     * the most critical periods.
     */
    severityLevels?: ("info" | "warning" | "error" | "critical")[] | undefined;

    /**
     * Optional list of representative status codes to filter on.
     *
     * This can be used to focus on specific failure patterns such as `401`
     * authentication errors or `429` throttling responses.
     */
    statusCodes?: (number & tags.Type<"int32">)[] | undefined;

    /**
     * Correlation identifier used to trace a specific transaction or
     * request flow across services.
     *
     * When provided, the search will restrict results to incidents sharing
     * this correlation ID, enabling deep‑dive investigations into a single
     * problematic transaction.
     */
    correlationId?: string | undefined;

    /**
     * Primary field used to sort the integration failure incident results.
     *
     * `occurred_at` – Sort by failure timestamp. `severity` – Sort by
     * severity level (implementation‑defined ordering). `integration_type`
     * – Sort by integration type identifier. `partner_identifier` – Sort by
     * external partner identifier.
     */
    sortBy?:
      | "occurred_at"
      | "severity"
      | "integration_type"
      | "partner_identifier"
      | undefined;

    /**
     * Sort direction applied to the selected `sortBy` field.
     *
     * `asc` – Ascending order. `desc` – Descending order. If omitted, most
     * implementations default to `desc` when sorting by `occurred_at` to
     * show the most recent incidents first.
     */
    sortOrder?: "asc" | "desc" | undefined;
  };

  /**
   * Summary view of a failed integration event within the shopping mall
   * platform.
   *
   * Provides a lightweight snapshot of an integration failure log entry that
   * is suitable for list views, monitoring dashboards, and cross-linking from
   * other entities. This summary focuses on identifiers, high‑level context
   * about the failing integration, and minimal diagnostic information needed
   * to triage or drill down into detailed logs.
   *
   * Typical use cases include: displaying recent failures in an admin
   * console, aggregating failures per integration provider, or linking to a
   * detailed failure record for in‑depth analysis.
   */
  export type ISummary = {
    /**
     * Unique identifier of the integration failure log entry.
     *
     * This UUID is generated by the system when the failure is recorded and
     * is used as the primary reference when drilling down to a detailed
     * view or correlating with other logs.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the integration failure occurred in ISO 8601 date-time
     * format.
     *
     * Represents the moment the platform detected or recorded the failure,
     * not when it is later processed or viewed.
     */
    occurred_at: string & tags.Format<"date-time">;

    /**
     * Logical name or identifier of the external integration provider or
     * subsystem where the failure occurred.
     *
     * Examples include names of payment gateways, messaging providers,
     * logistics APIs, or internal microservices that the shopping mall
     * platform depends on.
     */
    provider: string;

    /**
     * High‑level classification of the type of integration operation that
     * failed.
     *
     * Common examples might include values such as `payment_webhook`,
     * `shipment_update`, `refund_notification`, or `catalog_sync`. This
     * field is intended for reporting, filtering, and routing but is not
     * restricted to a fixed enumeration at the schema level.
     */
    integration_type: string;

    /**
     * Status or error code associated with the integration failure when
     * available.
     *
     * For HTTP-based integrations, this is typically the HTTP status code
     * returned by the external service. For non‑HTTP integrations, this may
     * represent a domain‑specific numeric error code.
     */
    status_code?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional short machine‑readable error code that categorizes the
     * reason for the failure.
     *
     * This value is usually derived from the external provider’s response
     * or from internal validation logic. It is suitable for grouping,
     * analytics, and conditional handling in monitoring tools.
     */
    error_code?: string | undefined;

    /**
     * Human‑readable message describing the integration failure in concise
     * terms.
     *
     * Intended to give operators enough context to understand what went
     * wrong without needing to open the full detailed log record. For
     * example, it may summarize validation errors, timeout conditions, or
     * authentication problems.
     */
    error_message: string;

    /**
     * Correlation identifier used to link this integration failure with
     * related requests, background jobs, or trace spans.
     *
     * This field allows cross‑system tracing, making it easier to follow a
     * single logical transaction across multiple services, logs, and
     * monitoring systems.
     */
    correlation_id?: string | undefined;

    /**
     * Indicates whether this integration failure is considered retryable
     * under current business rules.
     *
     * A value of `true` means that automated retry logic or manual
     * re‑execution is allowed or recommended. A value of `false` typically
     * indicates permanent failures such as invalid configuration,
     * permission issues, or data contract mismatches.
     */
    retryable: boolean;
  };
}
