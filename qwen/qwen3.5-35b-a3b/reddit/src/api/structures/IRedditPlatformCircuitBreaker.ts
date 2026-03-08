import { tags } from "typia";

export namespace IRedditPlatformCircuitBreaker {
  /**
   * Circuit breaker state summary for an external service dependency.
   *
   * A circuit breaker monitors the health of external service integrations (OAuth providers, third-party APIs, webhooks) and prevents cascading failures by opening the circuit when consecutive failures exceed the threshold. The summary provides visibility into the current health status and metrics for each configured external endpoint.
   *
   * The circuit breaker pattern has three states:
   * - **CLOSED**: Normal operation, requests proceed to external service
   * - **OPEN**: Circuit is tripped after consecutive failures, requests are immediately rejected
   * - **HALF-OPEN**: After a timeout period, one test request is allowed to check if the external service has recovered
   */
  export type ISummary = {
    /**
     * The external service endpoint URL being monitored by this circuit breaker.
     *
     * @x-autobe-specification URI string of the external service endpoint being monitored. This is the URL configured for the integration (e.g., OAuth provider endpoint, third-party API URL, webhook URL). Used by the circuit breaker to route requests and track failure rates per endpoint.
     */
    endpoint_url: string & tags.Format<"uri">;

    /**
     * Current health state of the circuit breaker.
     *
     * @x-autobe-specification Current circuit breaker state as an enum: CLOSED (normal operation, requests proceed to external service), OPEN (circuit tripped after consecutive failures, requests immediately rejected), or HALF-OPEN (timeout period elapsed, allows one test request to check if service recovered). State transitions: CLOSED → OPEN (after 5 consecutive failures), OPEN → HALF-OPEN (after 60 seconds timeout), HALF-OPEN → CLOSED (if test succeeds) or HALF-OPEN → OPEN (if test fails).
     */
    state: "closed" | "open" | "half-open";

    /**
     * Number of consecutive failures recorded for this endpoint.
     *
     * @x-autobe-specification Number of consecutive failures recorded for this external service. Reset to 0 whenever a request succeeds or when the circuit state transitions to CLOSED. Used to determine when to trip the circuit: when failure_count reaches 5, state transitions from CLOSED to OPEN.
     */
    failure_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of consecutive successful requests recorded for this endpoint.
     *
     * @x-autobe-specification Number of consecutive successful requests recorded for this external service. Reset to 0 whenever a request fails or when the circuit state transitions to OPEN or HALF-OPEN. Used to track recovery progress and can be used for analytics or metrics.
     */
    success_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Timestamp of the last failure, or null if no failures recorded.
     *
     * @x-autobe-specification Timestamp of the most recent failure for this external service. Set to null when no failures have been recorded or when the circuit state transitions to CLOSED. Updated on every failed request to the external service. Useful for troubleshooting and monitoring failure patterns.
     */
    last_failure_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the last state change.
     *
     * @x-autobe-specification Timestamp of the most recent circuit breaker state change (any transition between CLOSED, OPEN, or HALF-OPEN). Updated whenever the state property changes. This includes state changes from failures, timeouts, successful tests, or manual resets. Used to track circuit health history and troubleshoot issues.
     */
    last_state_change_at: string & tags.Format<"date-time">;

    /**
     * Scheduled time for the next test request (null except in HALF-OPEN state).
     *
     * @x-autobe-specification Timestamp when the next test request should be sent to the external service. Set to null when the circuit is CLOSED or OPEN. In HALF-OPEN state, this is calculated as current time plus the half-open timeout (60 seconds) and the system will send a test request at that time. If the test succeeds, state transitions to CLOSED; if it fails, state transitions back to OPEN. Null in all other states.
     */
    next_test_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
