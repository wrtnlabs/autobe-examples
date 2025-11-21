import { tags } from "typia";

export namespace IAccountVerificationStatus {
  /**
   * Summarized representation of account verification status entities
   * optimized for high-performance list views, search results, and dashboard
   * displays within the shopping mall platform.
   *
   * This status type manages the complete account verification lifecycle
   * across customer onboarding, email verification processes, two-factor
   * authentication enrollment, identity confirmation workflows, regulatory
   * compliance checks, and periodic re-verification requirements for payment
   * processing eligibility and merchant operations authorization.
   *
   * The verification statuses enable administrators and customer service
   * teams to efficiently monitor verification states across large customer
   * populations while supporting targeted communication for incomplete
   * verifications. The summary format supports various stakeholder interfaces
   * including customer profile displays, administrative oversight systems,
   * and customer service ticketing workflows requiring verification status
   * context for efficient account management and security monitoring across
   * the marketplace platform.
   */
  export type ISummary = {
    /**
     * Primary key identifier for this account verification status record.
     * Generated as UUID v4 for database storage and used for status
     * referencing in verification workflow systems.
     *
     * This ID enables unique identification of verification status
     * instances across the platform, supporting audit trails, status change
     * tracking, and integration with external compliance systems requiring
     * verifiable record identifiers.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Business identifier code serving as a human-readable system reference
     * for this verification status. Used in API responses, database foreign
     * key relationships, and system integration scenarios where
     * programmatic status identification is required.
     *
     * The code enables reliable status communication across system
     * components while maintaining flexibility for internationalization
     * support and business vocabulary changes without impacting system
     * integration points.
     */
    code: string;

    /**
     * Display name presented to end users within the shopping mall platform
     * interfaces, administrative dashboards, and customer-facing
     * verification processes. Supports localized content presentation while
     * maintaining consistent status communication across different user
     * contexts and platform interaction scenarios.
     *
     * The name field contains the verification status in user-friendly
     * format for profile displays, help documentation, and customer
     * communication workflows involving account verification requirements
     * and security status explanations.
     */
    name: string;

    /**
     * Comprehensive explanation of the verification status, including what
     * it means for user account access, functionality limitations, and
     * required next steps in the verification workflow. Contains
     * context-specific guidance for account management decisions and policy
     * compliance requirements across different user roles and account
     * types.
     *
     * The description field educates users and administrators about
     * verification state implications within the shopping mall marketplace
     * ecosystem including email verification requirements, two-factor
     * authentication expectations, identity document submission needs, and
     * regulatory compliance obligations governing merchant operations,
     * payment processing eligibility, and platform access rights.
     */
    description: string;
  };
}
