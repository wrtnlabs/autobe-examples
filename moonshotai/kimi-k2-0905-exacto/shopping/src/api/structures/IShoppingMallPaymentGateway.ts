import { tags } from "typia";

export namespace IShoppingMallPaymentGateway {
  /**
   * Payment gateway configuration summary providing essential operational
   * information for transaction processing and system integration decisions.
   * Represents the core payment processing infrastructure that enables
   * financial transactions across the shopping mall marketplace platform.
   *
   * Gateways serve as the bridge between customer payment methods and
   * financial institutions, handling authorization, settlement, and security
   * compliance requirements. Each gateway configuration defines specific
   * integration parameters, fee structures, geographic limitations, and
   * operational capabilities that determine transaction routing decisions.
   *
   * These summaries expose critical gateway metadata for transaction listing,
   * dashboard displays, and administrative oversight while protecting
   * sensitive configuration details like API credentials and webhook secrets.
   * The data enables informed payment method presentation to customers and
   * supports operational monitoring of payment processing performance across
   * different gateway providers.
   */
  export type ISummary = {
    /**
     * Primary Key - Factory Generated Identity. Unique identifier for
     * gateway configuration record used throughout the system for
     * referencing specific payment processor integrations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique gateway identifier code for system references and API routing
     * decisions. Used internally for gateway selection logic and
     * transaction processing workflows.
     */
    gateway_code: string;

    /**
     * Descriptive gateway name for administrative interfaces and
     * user-facing communications. Provides human-readable identification of
     * payment processor for customer service and merchant dashboard
     * displays.
     */
    gateway_name: string;

    /**
     * Gateway category distinguishing credit card processors, digital
     * wallets, and alternative payment methods. Determines business logic
     * behavior, integration patterns, and customer interface requirements.
     */
    gateway_type: string;

    /**
     * Supported currency list in JSON format defining multi-currency
     * transaction processing capabilities. Contains arrays of currency
     * codes and associated payment method configurations for international
     * commerce support.
     */
    supported_currencies: string;

    /**
     * Gateway operational status indicating whether payment processing is
     * currently enabled or disabled for new transactions while maintaining
     * existing processing capabilities.
     */
    is_active: boolean;

    /**
     * Primary gateway designation for preferred routing and default payment
     * method prioritization in checkout flows and transaction processing
     * logic.
     */
    is_primary: boolean;

    /**
     * Availability status for new transactions while maintaining existing
     * payment processing capabilities. Used for gateway rotation and
     * failover scenarios.
     */
    is_available?: boolean | undefined;

    /**
     * Primary API endpoint URL for payment processing requests and
     * integration communication. Represents the live production endpoint
     * for transaction processing.
     */
    api_endpoint: string;

    /**
     * Testing environment endpoint for development and integration testing
     * activities. Enables safe testing of payment flows without affecting
     * production transaction processing.
     */
    sandbox_endpoint?: (string & tags.Format<"uri">) | undefined;

    /**
     * Webhook authentication secret for secure callback verification and
     * event validation. Used to verify payment status updates and
     * transaction notifications from the gateway provider.
     */
    webhook_secret?: string | undefined;

    /**
     * Supported country list in JSON format for geographic processing
     * restrictions and compliance capabilities. Defines legal and
     * regulatory boundaries for payment processing operations.
     */
    country_availability: string;

    /**
     * Fee structure definition in JSON format for transparent cost
     * calculations and pricing models. Contains percentage rates, fixed
     * fees, and transaction type-specific pricing information.
     */
    processing_fees?: string | undefined;

    /**
     * Maximum transaction amount limit for risk management and regulatory
     * compliance requirements. Defines upper bounds for single transaction
     * processing to prevent fraud and manage exposure.
     */
    max_transaction_amount?: number | undefined;

    /**
     * Configuration parameter schema definition for gateway-specific
     * settings and capabilities. JSON schema defining required parameters,
     * validation rules, and integration requirements.
     */
    configuration_schema?: string | undefined;

    /**
     * Maximum acceptable risk score for automatic transaction processing
     * with manual review triggers. Establishes fraud detection thresholds
     * and risk management parameters.
     */
    risk_score_threshold?: number | undefined;

    /**
     * Retry policy configuration for failed transactions with backoff
     * strategies and limits. JSON structure defining retry attempts,
     * delays, and escalation procedures for payment failures.
     */
    retry_configuration?: string | undefined;

    /**
     * Gateway configuration creation timestamp for audit and change
     * tracking purposes. Records when the gateway integration was initially
     * established in the system.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Configuration modification timestamp for maintenance and monitoring
     * accuracy. Tracks the last time gateway settings were modified for
     * operational oversight.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
