import { tags } from "typia";

export namespace IShoppingMallPaymentGatewayFailovers {
  /**
   * Map structure for failure counts keyed by string category identifiers
   * with integer values. Represents counts of failures grouped by a specific
   * classification dimension such as error type, provider, region, or time of
   * day.
   *
   * This summary structure is used to provide aggregated failure analytics
   * across the payment gateway infrastructure, enabling financial operations
   * teams to identify patterns in payment processing failures. Each key in
   * this map represents a failure category (e.g., "network_timeout",
   * "merchant_decline", "fraud_blocked") and the corresponding value is an
   * integer count of occurrences in the specified time period. The structure
   * is designed for efficient aggregation and visualization in administrative
   * dashboards. These failure counts are critical for evaluating vendor
   * performance, detecting systemic integration issues, and making strategic
   * decisions about failover configurations and vendor relationships.
   *
   * The categories are dynamically determined by the payment gateway logs and
   * typically include: error codes, specific payment processor names,
   * regional failure patterns, and time-based failure trends. This data is
   * essential for predicting future failures, prioritizing system
   * improvements, and maintaining service reliability. The aggregated nature
   * of this summary allows for rapid assessment of system health without
   * exposing sensitive transactional details.
   *
   * Used exclusively in the endpoint
   * /shoppingMall/analytics/payment-gateway-failovers for administrative
   * monitoring and system resilience analysis.
   */
  export type ISummary = {
    /**
     * Discriminator field indicating this is a map of error counts. This
     * property ensures the type is properly identified as a failure count
     * summary structure by the API client.
     */
    type?: string | undefined;

    /**
     * Count of failures in the category represented by the key. Each value
     * corresponds to a specific failure classification such as error code,
     * payment provider, region, or time window (e.g., hourly failure
     * rates).
     *
     * These integer counters represent the aggregated occurrence of payment
     * processing failures across the platform during a specific monitoring
     * window. The keys are dynamically generated from payment gateway logs
     * and may represent: specific error codes (e.g., "timeout_504"),
     * gateway provider names (e.g., "stripe", "paypal"), geographic regions
     * (e.g., "eu", "us-west"), or temporal periods (e.g.,
     * "hourly_2024-01-10T23" - though typically aggregated into named
     * categories). This data enables administrators to identify systemic
     * issues, evaluate third-party payment provider reliability, and make
     * informed decisions about failover configurations and vendor
     * management.
     */
    additionalProperties?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;
  };
}
