import { tags } from "typia";

import { IEcommerceMallSuperAdmin } from "./IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLogMetadatum } from "./IEcommerceMallSuperAdminAuditLogMetadatum";

export namespace IEcommerceMallSuperAdminAuditLog {
  /**
   * Request body schema for retrieving filtered and paginated super administrator audit log entries. Contains optional search filters for action type, target entity, performer, and date range, plus pagination parameters.
   */
  export type IRequest = {
    /**
     * Filter by specific action types performed by the super administrator (e.g., 'promote_to_super_admin', 'demote_to_admin', 'login', 'logout').
     *
     * @x-autobe-specification Filter by specific action types such as 'promote_to_super_admin', 'demote_to_admin', 'login', 'logout', 'delete_admin', 'view_platform_settings'. Applies WHERE clause on action column in audit logs query.
     */
    action?: string | undefined;

    /**
     * Filter audit logs created on or after this date (ISO 8601 format).
     *
     * @x-autobe-specification Filter audit logs created on or after this date. Use ISO 8601 format (e.g., '2024-01-01T00:00:00Z'). Applies WHERE clause: created_at >= createdAtFrom. Combined with createdAtTo for date range filtering.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter audit logs created on or before this date (ISO 8601 format).
     *
     * @x-autobe-specification Filter audit logs created on or before this date. Use ISO 8601 format (e.g., '2024-12-31T23:59:59Z'). Applies WHERE clause: created_at <= createdAtTo. Combined with createdAtFrom for date range filtering.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Number of items per page (default 20, maximum 100).
     *
     * @x-autobe-specification Pagination parameter for maximum number of records per page. Default value is 20, maximum allowed is 100. Controls the LIMIT clause in SQL query. Actual count may be less on the last page.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Page number for pagination (default 1).
     *
     * @x-autobe-specification Pagination parameter for page number. Default value is 1. Used to calculate OFFSET in SQL query: OFFSET = (page - 1) * limit. Determines which subset of results to return.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Filter by the UUID of the super administrator who performed the action.
     *
     * @x-autobe-specification Filter by the UUID of the super administrator who performed the action. Applies WHERE clause on ecommerce_mall_super_admin_id column. Joins with ecommerce_mall_super_admins table to include performer email in response.
     */
    superAdminId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by the UUID of the entity that was affected by the action.
     *
     * @x-autobe-specification Filter by the UUID of the entity that was affected by the action. Applies WHERE clause on target_id column. Nullable column - only present when an entity was targeted.
     */
    targetId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by type of entity affected by the action (e.g., 'admin', 'seller', 'customer', 'product', 'order').
     *
     * @x-autobe-specification Filter by type of entity affected by the action. Examples: 'admin', 'super_admin', 'seller', 'customer', 'product', 'order'. Applies WHERE clause on target_type column. Nullable column - only present when an entity was targeted.
     */
    targetType?: string | undefined;
  };

  /**
   * Lightweight summary of a super administrator audit log entry for list display. Includes the action performed, target entity affected, execution context (IP, user agent), timestamp, and the super administrator who performed the action.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property action
     */
    action: string;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property ip
     */
    ip: string;
    /**
     * @x-autobe-database-schema-property user_agent
     */
    user_agent: string;

    /**
     * Type of entity that was affected by the action (e.g., 'admin', 'seller', 'customer').
     *
     * @x-autobe-database-schema-property target_type
     * @x-autobe-specification Direct mapping from ecommerce_mall_super_admin_audit_logs.target_type. Nullable column - only present when an entity was targeted.
     */
    target_type?: string | null | undefined;

    /**
     * Unique identifier of the entity that was affected by the action.
     *
     * @x-autobe-database-schema-property target_id
     * @x-autobe-specification Direct mapping from ecommerce_mall_super_admin_audit_logs.target_id. Nullable column - only present when an entity was targeted.
     */
    target_id?: (string & tags.Format<"uuid">) | null | undefined;
    /**
     * @x-autobe-database-schema-property superAdmin
     */
    superAdmin: IEcommerceMallSuperAdmin.ISummary;
  };

  /**
   * Super administrator audit log entry with parent super administrator context and metadata entries. Used in the response of retrieving a specific audit log by ID.
   */
  export type IInvert = {
    action: string;
    created_at: string & tags.Format<"date-time">;
    id: string & tags.Format<"uuid">;
    ip: string;
    metadataEntries: IEcommerceMallSuperAdminAuditLogMetadatum[];
    superAdmin: IEcommerceMallSuperAdmin.ISummary;
    target_id?: (string & tags.Format<"uuid">) | undefined;
    target_type?: string | undefined;
    updated_at: string & tags.Format<"date-time">;
    user_agent: string;
  };
}
