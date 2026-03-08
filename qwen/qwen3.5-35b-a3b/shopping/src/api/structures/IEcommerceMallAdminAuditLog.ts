import { tags } from "typia";

import { IEcommerceMallAdmin } from "./IEcommerceMallAdmin";

export namespace IEcommerceMallAdminAuditLog {
  /**
   * Search criteria and pagination parameters for querying audit trail records. Supports filtering by date range, user identity, operation type, entity identity, and result status. Includes sorting and pagination controls for navigating large audit datasets.
   */
  export type IRequest = {
    dateRange?: IEcommerceMallAdminAuditLog.IDateRangeFilter | null | undefined;
    adminId?: (string & tags.Format<"uuid">) | null | undefined;
    changedBy?: (string & tags.Format<"uuid">) | null | undefined;
    actionType?: string | null | undefined;
    recordType?: string | null | undefined;
    entityType?: string | null | undefined;
    entityId?: (string & tags.Format<"uuid">) | null | undefined;
    recordId?: string | null | undefined;
    resultStatus?: string | null | undefined;
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | null
      | undefined;
    cursor?: string | null | undefined;
    sortBy?:
      | "timestamp"
      | "actionType"
      | "recordType"
      | "adminId"
      | "changedBy"
      | null
      | undefined;
    sortOrder?: "ASC" | "DESC" | null | undefined;
  };

  /**
   * Unified audit trail entry tracking all system actions and changes. Combines administrator activity logs and entity snapshot changes into a single view with type discriminator. Used for security monitoring, compliance auditing, dispute resolution, and change history tracking across the entire platform.
   */
  export type ISummary = {
    /**
     * Unique identifier for this audit trail entry.
     *
     * @x-autobe-specification Unique identifier for the audit trail entry. For admin logs: from audit_logs.id. For snapshots: from snapshot_audits.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of audit trail entry: 'admin_log' or 'snapshot_audit'.
     *
     * @x-autobe-specification Type discriminator value: 'admin_log' for administrator action logs, 'snapshot_audit' for entity snapshot changes. Used to determine source table and schema structure.
     */
    type: "admin_log" | "snapshot_audit";

    /**
     * Timestamp when the audit event occurred.
     *
     * @x-autobe-specification When the audit event occurred. For admin logs: created_at from audit_logs. For snapshots: created_at from snapshot_audits. RFC3339 date-time format.
     */
    timestamp: string & tags.Format<"date-time">;

    /**
     * User who performed the action, or null for system-generated snapshots.
     *
     * @x-autobe-specification For admin logs: joins to ecommerce_mall_admins.id and returns IEcommerceMallAdmin.ISummary. For snapshots: NULL (no single user, could be system or multiple users). Returns user summary with id and email, or null.
     */
    user: IEcommerceMallAdmin.ISummary | string;

    /**
     * Type of operation performed, such as 'user_ban', 'category_create', or 'product_edit'.
     *
     * @x-autobe-specification For admin logs: action_type from audit_logs (e.g., 'user_ban', 'category_create'). For snapshots: recordType from snapshot_audits (e.g., 'product', 'product_variant'). Describes the type of operation performed.
     */
    operationType: string;

    /**
     * Type of entity being audited, such as 'ecommerce_mall_customers' or 'ecommerce_mall_categories'.
     *
     * @x-autobe-specification For admin logs: same as entityType (target_entity_type). For snapshots: recordType from snapshot_audits. Indicates the entity type being audited (e.g., 'ecommerce_mall_customers', 'ecommerce_mall_categories').
     */
    recordType?: string | undefined;

    /**
     * Full qualified name of the entity that was affected by the action.
     *
     * @x-autobe-specification For admin logs: target_entity_type from audit_logs. For snapshots: entityType from snapshot_audits. Full qualified entity name (e.g., 'ecommerce_mall_customers').
     */
    entityType: string;

    /**
     * Unique identifier of the entity that was affected by the action.
     *
     * @x-autobe-specification For admin logs: target_entity_id from audit_logs. For snapshots: recordId from snapshot_audits. UUID of the entity being audited. Can be null for actions not targeting specific entity.
     */
    entityId: string & tags.Format<"uuid">;

    /**
     * Identifier for tracking and correlating related audit records.
     *
     * @x-autobe-specification For admin logs: request_id from audit_logs (correlation ID for related actions). For snapshots: recordId from snapshot_audits (UUID of the snapshot record). Used for tracking and correlation.
     */
    recordId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Summary of changes made during this audit event.
     *
     * @x-autobe-specification For admin logs: changes string from audit_logs (high-level description). For snapshots: object with oldValues and newValues from snapshot_audits (JSON blob). Can be string or IEcommerceMallAdminAuditLog.IChange object.
     */
    changes: IEcommerceMallAdminAuditLog.IChange | string;

    /**
     * Current status of the audit record, typically 'active' for immutable audit trails.
     *
     * @x-autobe-specification For admin logs: 'active' (logs are immutable). For snapshots: 'active' (always active). Fixed value indicating the audit record is active and immutable.
     */
    status: string;
  };

  /**
   * Date range filter for querying audit trail records. This filter supports multiple comparison operators for flexible time-based queries on audit logs. Filter by date ranges, specific dates, or time periods relative to the audit log timestamp. Used primarily for security monitoring and compliance auditing to trace activities within specific time windows.
   */
  export type IDateRangeFilter = {
    /**
     * Comparison operator for date range filtering.
     *
     * @x-autobe-specification Query parameter that determines the comparison operator for date range filtering. Supported values:
     * - 'between': Filter records between two dates (dates array must have 2 items)
     * - 'before': Filter records before or on a specific date (dates array must have 1 item)
     * - 'after': Filter records after or on a specific date (dates array must have 1 item)
     * - 'within_range': Filter records within a custom time range (dates array must have 2+ items)
     * - 'specific_date': Filter records matching an exact date (dates array must have 1 item)
     * - 'since': Filter records from a start date onwards, inclusive (dates array must have 1 item)
     * - 'until': Filter records up to an end date, inclusive (dates array must have 1 item)
     *
     * The interpretation of dates array values depends on filterType.
     */
    filterType:
      | "between"
      | "before"
      | "after"
      | "within_range"
      | "specific_date"
      | "since"
      | "until";

    /**
     * Array of ISO 8601 date-time values for filtering.
     *
     * @x-autobe-specification Array of ISO 8601 date-time values for filtering (format: '2024-01-15T10:30:00Z').
     *
     * Number of dates required based on filterType:
     * - 'between': Exactly 2 dates [startDate, endDate]
     * - 'before': Exactly 1 date (maximum date)
     * - 'after': Exactly 1 date (minimum date)
     * - 'within_range': 2 or more dates for custom periods
     * - 'specific_date': Exactly 1 date (exact match)
     * - 'since': Exactly 1 date (inclusive start)
     * - 'until': Exactly 1 date (inclusive end)
     *
     * Used to filter ecommerce_mall_admin_audit_logs by created_at timestamp.
     */
    dates: (string & tags.Format<"date-time">)[] & tags.MinItems<1>;
  };

  /**
   * Structured representation of entity state changes for audit tracking. Contains both the previous state (oldValues) and current state (newValues) of an entity at the time of modification, enabling dispute resolution, change verification, and compliance auditing.
   */
  export type IChange = {
    /**
     * Entity state before the modification. Contains all field values as they existed before the change was made, enabling historical reconstruction and dispute verification.
     *
     * @x-autobe-database-schema-property old_values
     * @x-autobe-specification Direct mapping from snapshot_audits.changes.old_values. Contains the complete entity state BEFORE the modification. Structure varies by entity type but includes all field values at the point before change. Used for dispute resolution and audit comparison.
     */
    oldValues: {
      [key: string]: string;
    };

    /**
     * Entity state after the modification. Contains all field values as they exist after the change, representing the current state of the entity post-modification.
     *
     * @x-autobe-database-schema-property new_values
     * @x-autobe-specification Direct mapping from snapshot_audits.changes.new_values. Contains the complete entity state AFTER the modification. Structure matches old_values but reflects current field values. Used to establish the new baseline state after change.
     */
    newValues: {
      [key: string]: string;
    };
  };
}
