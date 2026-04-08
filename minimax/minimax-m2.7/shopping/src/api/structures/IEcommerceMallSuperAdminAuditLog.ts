import { tags } from "typia";

import { IEcommerceMallSuperAdmin } from "./IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLogMetadatum } from "./IEcommerceMallSuperAdminAuditLogMetadatum";

export namespace IEcommerceMallSuperAdminAuditLog {
  /**
   * Request parameters for filtering and paginating super administrator audit log entries.
   *
   * Provides filtering criteria to search audit logs by action type, target entity, performer, and date range, along with pagination controls for result pagination.
   *
   * **Filtering Options:**
   * - Filter by action type (e.g., 'promote_to_super_admin', 'demote_to_admin', 'login')
   * - Filter by target entity type (e.g., 'admin', 'super_admin', 'seller', 'customer')
   * - Filter by specific target identifier
   * - Filter by the super administrator who performed the action
   * - Filter by date range (created_at from/to)
   *
   * **Pagination:**
   * Default page size is 20 records. Maximum limit is 100 records.
   */
  export type IRequest = {
    /**
     * Filter by the type of action performed.
     *
     * The action type string to filter audit log entries by. Examples include 'promote_to_super_admin', 'demote_to_admin', 'login', 'logout', 'delete_admin', 'view_platform_settings'.
     *
     * @x-autobe-specification Filter by action type. Maps to ecommerce_mall_super_admin_audit_logs.action column via exact match WHERE clause.
     */
    action?: string | undefined;

    /**
     * Filter by the type of entity affected by the action.
     *
     * The target entity type string to filter by. Examples include 'admin', 'super_admin', 'seller', 'customer', 'product', 'order'.
     *
     * @x-autobe-specification Filter by target entity type. Maps to ecommerce_mall_super_admin_audit_logs.target_type column via exact match WHERE clause.
     */
    target_type?: string | undefined;

    /**
     * Filter by the unique identifier of the entity that was affected by the action.
     *
     * The UUID of the specific target entity to filter audit logs by.
     *
     * @x-autobe-specification Filter by target entity ID. Maps to ecommerce_mall_super_admin_audit_logs.target_id column via exact match WHERE clause.
     */
    target_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by the super administrator who performed the action.
     *
     * The UUID of the super administrator whose audit log entries should be returned.
     *
     * @x-autobe-specification Filter by super admin ID. Maps to ecommerce_mall_super_admin_audit_logs.ecommerce_mall_super_admin_id column via exact match WHERE clause.
     */
    super_admin_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter audit log entries created on or after this date and time.
     *
     * ISO 8601 formatted datetime string representing the start of the date range filter for the created_at timestamp.
     *
     * @x-autobe-specification Date range filter start. Maps to ecommerce_mall_super_admin_audit_logs.created_at column: WHERE created_at >= value.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter audit log entries created on or before this date and time.
     *
     * ISO 8601 formatted datetime string representing the end of the date range filter for the created_at timestamp.
     *
     * @x-autobe-specification Date range filter end. Maps to ecommerce_mall_super_admin_audit_logs.created_at column: WHERE created_at <= value.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination.
     *
     * The page number to retrieve. Page numbering starts at 1. If not specified, defaults to page 1.
     *
     * @x-autobe-specification Pagination parameter for page number. Computed: offset = (page - 1) * limit. Default value: 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * The maximum number of audit log entries to return in a single page. Must be between 1 and 100. Default is 20.
     *
     * @x-autobe-specification Pagination parameter for maximum records per page. Controls SQL LIMIT clause. Default: 20, Max: 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field and direction for sorting results.
     *
     * The field to sort by and the sort direction (asc or desc). Default sort is by created_at in descending order (newest first).
     *
     * @x-autobe-specification Sorting parameter for result ordering. Default: 'created_at desc'. Controls SQL ORDER BY clause.
     */
    sort?: string | undefined;
  };

  /**
   * Summary representation of a super administrator audit log entry for list displays.
   *
   * Contains the essential fields needed to identify and display audit records: action type, affected target, actor information, and timestamp. The super administrator who performed the action is included as a summary reference.
   *
   * **Use Cases**:
   * - Audit log listing in admin dashboard
   * - Security review displays
   * - Action history tracking
   */
  export type ISummary = {
    /**
     * Type of action performed by the super administrator. Examples: 'promote_to_super_admin', 'demote_to_admin', 'login', 'logout'.
     *
     * @x-autobe-database-schema-property action
     */
    action: string;

    /**
     * Timestamp when the audit log record was created.
     *
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Primary key identifier of the audit log entry.
     *
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;

    /**
     * IP address from which the super administrator performed the action.
     *
     * @x-autobe-database-schema-property ip
     */
    ip: string;
    /**
     * @x-autobe-database-schema-property superAdmin
     */
    superAdmin?: IEcommerceMallSuperAdmin.ISummary | undefined;

    /**
     * Unique identifier of the entity that was affected by the action.
     *
     * @x-autobe-database-schema-property target_id
     * @x-autobe-specification Direct mapping from ecommerce_mall_super_admin_audit_logs.target_id. Nullable column storing UUID of affected entity.
     */
    target_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Type of entity that was affected by the action. Examples: 'admin', 'super_admin', 'seller', 'customer'.
     *
     * @x-autobe-database-schema-property target_type
     * @x-autobe-specification Direct mapping from ecommerce_mall_super_admin_audit_logs.target_type. Nullable column storing target entity type.
     */
    target_type?: string | null | undefined;

    /**
     * User agent string of the browser or client used by the super administrator.
     *
     * @x-autobe-database-schema-property user_agent
     */
    user_agent: string;
  };

  /**
   * Super administrator audit log with parent context.
   *
   * Represents a complete audit trail record including the super administrator who performed the action and all associated metadata entries. Used for security investigations, compliance audits, and reviewing administrative decisions.
   *
   * **Contents:**
   * - Audit log identifier and action details
   * - Target entity information (type and ID)
   * - Security tracking (IP address, user agent)
   * - Timestamps for action timing
   * - Super administrator email for accountability
   * - Metadata key-value pairs for additional context
   */
  export type IInvert = {
    /**
     * Type of action performed by the super administrator. Examples: 'promote_to_super_admin', 'demote_to_admin', 'login', 'logout', 'delete_admin', 'view_platform_settings'.
     */
    action: string;

    /**
     * Timestamp when the audit log record was created.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Primary key identifier of the audit log entry.
     */
    id: string & tags.Format<"uuid">;

    /**
     * IP address from which the super administrator performed the action.
     */
    ip: string;

    /**
     * Array of metadata key-value pairs providing additional context for the audit action, such as previous state, new state, reason, or target entity details.
     */
    metadataEntries: IEcommerceMallSuperAdminAuditLogMetadatum.ISummary[];

    /**
     * Super administrator who performed the action, included as summary with email for accountability.
     */
    superAdmin: IEcommerceMallSuperAdmin.ISummary;

    /**
     * Unique identifier of the entity that was affected by the action. Null if no specific target entity.
     */
    targetId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Type of entity that was affected by the action. Examples: 'admin', 'super_admin', 'seller', 'customer', 'product', 'order'. Null if no specific target.
     */
    targetType?: string | undefined;

    /**
     * Timestamp when the audit log record was last updated.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * User agent string of the browser or client used by the super administrator.
     */
    userAgent: string;
  };
}
