import { tags } from "typia";

import { IShoppingMallPaymentGateway } from "./IShoppingMallPaymentGateway";

export namespace IShoppingMallPaymentMethod {
  /**
   * Payment method configuration summary providing customer-facing payment
   * options with essential operational parameters for checkout interface
   * presentation and transaction processing decisions.
   *
   * Payment methods represent the customer-visible payment choices available
   * during checkout, such as Visa, Mastercard, PayPal, or bank transfer
   * options. Each method configuration defines display properties,
   * transactional requirements, business logic rules, and integration
   * parameters that determine how customers complete purchases through the
   * shopping mall platform.
   *
   * These summaries balance information disclosure requirements against
   * security considerations, exposing sufficient detail for informed payment
   * selection while protecting configuration secrets and avoiding data
   * exposure that could compromise system security or competitive positioning
   * in the marketplace ecosystem.
   */
  export type ISummary = {
    /**
     * Primary Key - Factory Generated Identity from payment method
     * configuration record used for system references and transaction
     * tracking.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique payment method identifier for system referencing and customer
     * interface labeling purposes. Used in checkout flows and transaction
     * processing logic.
     */
    method_code: string;

    /**
     * User-friendly method name displayed in payment interfaces for clear
     * customer selection guidance during checkout processes.
     */
    method_name: string;

    /**
     * Payment method category including credit_cards, digital_wallets,
     * bank_transfers for business logic classification and operational
     * categorization.
     */
    method_type: string;

    /**
     * Business category grouping for operational reporting and analytics
     * consolidation purposes across different payment classification
     * systems.
     */
    method_category: string;

    /**
     * Interface display sequence number for payment method prioritization
     * in customer selection interfaces and checkout presentation ordering.
     */
    display_order: number & tags.Type<"int32">;

    /**
     * Availability status determining whether customers can select this
     * payment method during checkout and transaction processing workflows.
     */
    is_active: boolean;

    /**
     * Customer interface visibility control indicating if the method should
     * appear in selection lists for user-facing payment options.
     */
    is_visible: boolean;

    /**
     * Authorization requirement flag for payment methods needing real-time
     * approval during transaction processing and payment validation steps.
     */
    requires_authorization: boolean;

    /**
     * Associated gateway configuration showing payment processing
     * capabilities and integration details for transaction routing
     * decisions.
     */
    paymentGateway?: IShoppingMallPaymentGateway.ISummary | undefined;

    /**
     * Foreign key reference to the associated payment gateway configuration
     * defining the processing backend and integration parameters for this
     * payment method.
     */
    shopping_mall_payment_gateway_id: string & tags.Format<"uuid">;

    /**
     * Geographic restrictions in JSON format supporting regional payment
     * method availability management and compliance-based limitations.
     */
    country_restrictions?: string | undefined;

    /**
     * Currency limitations in JSON format defining supported currencies for
     * specific payment method types and transaction processing
     * constraints.
     */
    currency_restrictions?: string | undefined;

    /**
     * Minimum transaction amount requirement for payment method eligibility
     * and selection validation in checkout flows.
     */
    minimum_amount?: number | undefined;

    /**
     * Maximum transaction amount limit for payment method availability
     * based on processing capabilities and risk management parameters.
     */
    maximum_amount?: number | undefined;

    /**
     * Payment method icon URL for visual representation in payment
     * selection interfaces and customer-facing checkout presentations.
     */
    icon_url?: (string & tags.Format<"uri">) | undefined;

    /**
     * Detailed method description providing customers with processing
     * expectations, important feature information, and usage guidelines for
     * informed payment selection.
     */
    description: string;

    /**
     * Method-specific configuration schema in JSON format for validation
     * and processing parameter requirements defining integration
     * constraints.
     */
    configuration_options?: string | undefined;

    /**
     * Required verification data in JSON format for payment method
     * activation and security compliance including documentation and
     * validation criteria.
     */
    verification_requirements?: string | undefined;

    /**
     * Special processing instructions or notes for operational teams
     * managing payment method configurations and troubleshooting
     * integration issues.
     */
    processing_instructions?: string | undefined;

    /**
     * Method configuration creation timestamp for configuration management
     * and audit trail maintenance across payment system lifecycle.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Configuration update timestamp for change tracking and operational
     * monitoring purposes ensuring configuration accuracy and maintenance
     * oversight.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
