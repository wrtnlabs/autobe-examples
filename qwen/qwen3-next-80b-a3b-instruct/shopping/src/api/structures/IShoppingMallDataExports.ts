import { tags } from "typia";

export namespace IShoppingMallDataExports {
  /**
   * Request parameters for retrieving compliance data exports for audit and
   * regulatory purposes. This schema defines the search, filtering, and
   * pagination criteria used to generate comprehensive compliance reports
   * from the shopping_mall_compliance_records and shopping_mall_data_exports
   * tables. The exported data must meet strict regulatory requirements for
   * GDPR, CCPA, financial audits, and other compliance frameworks.
   *
   * Compliance data exports contain personally identifiable information,
   * regulatory documentation, and audit trails that must be handled with the
   * highest security standards. Only administrative actors with appropriate
   * permissions can initiate these exports. The request parameters must be
   * carefully crafted to ensure the export contains exactly the necessary
   * data for compliance purposes, without exposing unnecessary information.
   *
   * The export process generates structured reports that are used for
   * internal audits, regulatory submissions, and operational reviews. Each
   * export is assigned a unique identifier, can be filtered by region and
   * regulatory category, and must specify its generation priority to ensure
   * efficient system resource allocation.
   *
   * This schema is used exclusively by admin actors via the PATCH
   * /shoppingMall/admin/compliance/data-exports endpoint and forms the basis
   * of the organization's compliance record-keeping system.
   */
  export type IRequest = {
    /**
     * Page number for pagination in compliance export requests.
     *
     * Used to retrieve specific portions of large compliance datasets that
     * may contain thousands of records spanning multiple years.
     *
     * Must be greater than or equal to 1. Pagination is essential for
     * compliance audits because it allows auditors to systematically review
     * data in manageable batches while maintaining complete traceability
     * through sequential page requests.
     *
     * System constraints limit the maximum page number to prevent resource
     * exhaustion and ensure acceptable response times for compliance
     * reporting.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of records per page in compliance export requests.
     *
     * Must be between 1 and 100 to balance performance with usability.
     *
     * Lower limits (10-20) are preferred for detailed audit reviews where
     * each record requires manual examination. Higher limits (50-100) are
     * appropriate for bulk processing or automated compliance checks.
     *
     * System-enforced maximum of 100 prevents resource-intensive requests
     * that could impact the performance of critical audit systems.
     *
     * This constraint ensures compliance data exports remain manageable and
     * do not overwhelm system resources during large-scale regulatory
     * reporting.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Full-text search across compliance export metadata fields including
     * exportType, createdBy, description, and exportCategory.
     *
     * Used to locate specific compliance exports by searching relevant
     * keywords or identifiers.
     *
     * Can search across:
     *
     * - Export type (e.g., 'GDPR', 'FinancialAudit')
     * - Requester identifier (user ID or name)
     * - Export description notes
     * - Regulatory category (e.g., 'CCPA', 'TaxReporting')
     *
     * This search function enables auditors to quickly locate specific
     * compliance records without requiring exact matching of identifiers.
     * The search is case-insensitive and supports partial matches.
     */
    search?: (string & tags.MinLength<1>) | undefined;

    /**
     * Type of compliance regulation or reporting requirement that this
     * export addresses.
     *
     * Specifies the regulatory framework or internal policy for which the
     * export is being generated.
     *
     * Accepted values and their business contexts:
     *
     * - "GDPR": General Data Protection Regulation for EU data subject rights
     * - "CCPA": California Consumer Privacy Act for California residents
     * - "FinancialAudit": Internal financial records for accounting
     *   compliance
     * - "UserActivity": User behavior and interaction logs for security
     *   audits
     * - "RegulatoryCompliance": General regulatory reporting across multiple
     *   jurisdictions
     * - "SystemLog": System operation and configuration change logs
     *
     * This field ensures exports are categorized appropriately for
     * regulatory review and audit trail purposes.
     */
    exportType?:
      | "GDPR"
      | "CCPA"
      | "FinancialAudit"
      | "UserActivity"
      | "RegulatoryCompliance"
      | "SystemLog"
      | undefined;

    /**
     * Filter compliance exports by their current processing status.
     *
     * Used to monitor the progress of compliance reporting requests.
     *
     * Accepted values and their business contexts:
     *
     * - "pending": Request has been submitted but not yet processed
     * - "processing": Export job is actively generating data
     * - "completed": Export has been successfully generated and is ready for
     *   download
     * - "failed": Export job encountered an error and could not complete
     *
     * This filter is essential for administrative oversight of compliance
     * reporting workflows, allowing administrators to identify delayed,
     * failed, or completed audit requests.
     */
    complianceStatus?:
      | "pending"
      | "processing"
      | "completed"
      | "failed"
      | undefined;

    /**
     * Geographic region for compliance export filtering.
     *
     * Specifies the jurisdiction or territory for which compliance data
     * should be exported.
     *
     * Examples of valid regions:
     *
     * - "EU": European Union
     * - "US-CA": California, USA
     * - "US-NY": New York, USA
     * - "JP": Japan
     *
     * This field is critical because different jurisdictions have different
     * data retention and disclosure requirements under local privacy laws.
     * Filtering exports by region ensures that compliance documentation
     * respects regional legal boundaries and avoids unauthorized
     * cross-border data transfers.
     */
    region: string & tags.MinLength<1>;

    /**
     * Output format specification for the compliance data export.
     *
     * Determines the structure and presentation of the exported report.
     *
     * Accepted values:
     *
     * - "json": Structured JSON format for programmatic processing and API
     *   consumption
     * - "csv": Comma-separated values format for spreadsheet analysis and
     *   manual review
     * - "pdf": Portable Document Format for official submission and archival
     *   purposes
     *
     * Selection of format impacts how the exported data will be used: JSON
     * for automation, CSV for analysis, PDF for formal reporting. The
     * choice must align with the consumption requirements of the regulatory
     * authority or internal audit team.
     */
    exportFormat: "json" | "csv" | "pdf";

    /**
     * Depth of data inclusion in the compliance export.
     *
     * Determines the comprehensiveness of the exported information.
     *
     * Accepted values:
     *
     * - "summary": Includes only high-level metadata and aggregate statistics
     * - "detailed": Includes full records with individual events and
     *   timestamps
     * - "full": Includes complete data including system metadata, audit
     *   trails, and related documents
     *
     * The audit level determines the sensitivity of the export and must be
     * selected in accordance with privacy requirements. Summary exports are
     * appropriate for oversight, while full exports are required for
     * forensic audits.
     *
     * In many regulatory contexts, full exports may require additional
     * authorization due to the sensitive nature of the data included.
     */
    auditLevel: "summary" | "detailed" | "full";

    /**
     * Flag indicating whether system metadata should be included in the
     * compliance export.
     *
     * System metadata includes information such as:
     *
     * - Timestamps of export generation
     * - System identifiers
     * - Processing logs
     * - API access details
     * - Server environment information
     *
     * When true, the export includes detailed system information that may
     * be necessary for forensic analysis or technical audits.
     *
     * When false, the export contains only business data and omits
     * system-level identifiers, improving privacy compliance.
     *
     * This flag is critical because including metadata may trigger
     * additional security and privacy protections under certain
     * jurisdictional regulations, particularly when data crosses
     * international borders.
     */
    includeMetadata: boolean;

    /**
     * Categorization of the compliance export by regulatory purpose.
     *
     * Classifies the export according to its primary compliance objective
     * or jurisdictional requirement.
     *
     * Accepted values and their contexts:
     *
     * - "GDPR": European Union General Data Protection Regulation
     * - "CCPA": California Consumer Privacy Act
     * - "TaxReporting": Tax compliance and financial reporting obligations
     * - "SecurityAudit": Internal security incident investigation records
     * - "FinancialReporting": Financial accounting and audit requirements
     * - "PrivacyAudit": User privacy rights and data access requests
     * - "SystemCompliance": Internal IT and system compliance policies
     *
     * Each category represents a distinct compliance domain with its own
     * documentation requirements, retention periods, and disclosure rules.
     *
     * This field enables automated classification of exports and ensures
     * proper categorization for audit trail maintenance.
     */
    exportCategory:
      | "GDPR"
      | "CCPA"
      | "TaxReporting"
      | "SecurityAudit"
      | "FinancialReporting"
      | "PrivacyAudit"
      | "SystemCompliance";

    /**
     * Processing priority for the compliance export request.
     *
     * Determines the order and speed of export generation within the
     * system's queue.
     *
     * Accepted values:
     *
     * - "low": Standard priority; exports are processed during off-peak hours
     * - "normal": Routine priority; exports are queued for standard
     *   processing
     * - "high": Expedited priority; exports are processed immediately
     *
     * Priority selection impacts response time and system resource
     * allocation. High priority should only be used for time-sensitive
     * regulatory deadlines or emergency audits. Low priority is suitable
     * for scheduled routine reporting.
     *
     * System resources are dynamically allocated based on this priority,
     * with high-priority exports receiving greater bandwidth and
     * computational resources.
     */
    priority: "low" | "normal" | "high";

    /**
     * Filter compliance exports by their status.
     *
     * Used to retrieve only exports that match a specific status,
     * facilitating targeted administrative review.
     *
     * Accepted values:
     *
     * - "pending": Only exports waiting to be processed
     * - "processing": Only exports currently being generated
     * - "completed": Only successfully completed exports
     * - "failed": Only exports that encountered errors
     *
     * This filter allows administrators to focus on specific workloads,
     * such as investigating failed exports or monitoring progress of urgent
     * requests.
     *
     * When combined with other filters, this enables precise tracking of
     * compliance reporting status across the platform.
     */
    statusFilter: "pending" | "processing" | "completed" | "failed";
  };

  /**
   * Summary representation of compliance data exports for audit and reporting
   * purposes. Contains essential metadata for regulatory review without
   * exposing full detailed records, following security best practices for
   * list endpoints. Each export represents a generated compliance report from
   * the shopping_mall_compliance_records and shopping_mall_data_exports
   * tables, with timestamps, user actions, and export metadata filtered by
   * compliance status, export type, and date range. This summary DTO is
   * designed for listing contexts where complete audit trail details are not
   * needed, with full records accessible via individual endpoint retrieval.
   * Contains no authentication context, no sensitive data, and no
   * system-managed fields that should be client-controlled.
   */
  export type ISummary = {
    /** Unique identifier for the compliance data export record. */
    id: string & tags.Format<"uuid">;

    /**
     * Type of compliance report generated (e.g., financial_audit,
     * user_activity, regulatory_compliance). Corresponds to predefined
     * categories in the compliance system.
     */
    exportType: string;

    /**
     * Current status of the export process. Indicates whether the export is
     * queued, actively processing, completed successfully, or failed during
     * generation.
     */
    exportStatus: "pending" | "processing" | "completed" | "failed";

    /** ID of the admin user who requested this compliance export. */
    requestedBy: string & tags.Format<"uuid">;

    /** Timestamp when the compliance export was requested by the admin user. */
    requestedAt: string & tags.Format<"date-time">;

    /**
     * File format of the generated compliance report. Determines the
     * structure and presentation of the exported data.
     */
    exportFormat: "json" | "csv" | "pdf";

    /**
     * Total number of compliance records included in this export. Reflects
     * the quantity of data processed and contained in the report.
     */
    recordsCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Brief description or note about the purpose of this specific
     * compliance export. May reference regulations, audit requirements, or
     * specific time periods covered.
     */
    description: string;
  };
}
