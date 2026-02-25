import { tags } from "typia";

export namespace IShoppingMallSystemAuditLog {
  /**
   * Summary of system audit log for listing displays, containing essential identification and metadata without large text fields.
   */
  export type ISummary = {
    /**
     * Unique identifier of the audit log entry
     *
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of actor who performed the operation (customer, seller, admin, system)
     *
     * @x-autobe-database-schema-property actor_type
     */
    actor_type: string;

    /**
     * ID of the actor who performed the operation
     *
     * @x-autobe-database-schema-property actor_id
     */
    actor_id: string & tags.Format<"uuid">;

    /**
     * Type of operation performed (create, read, update, delete, login, logout, approve, reject, suspend, unsuspend)
     *
     * @x-autobe-database-schema-property operation_type
     */
    operation_type: string;

    /**
     * Type of entity affected by the operation (customer, seller, product, order, review, etc.)
     *
     * @x-autobe-database-schema-property entity_type
     */
    entity_type: string;

    /**
     * ID of the entity affected by the operation
     *
     * @x-autobe-database-schema-property entity_id
     */
    entity_id: string & tags.Format<"uuid">;

    /**
     * IP address from which the operation was performed
     *
     * @x-autobe-database-schema-property ip_address
     */
    ip_address: string;

    /**
     * Human-readable description of the operation performed.
     *
     * @x-autobe-database-schema-property description
     * @x-autobe-specification Direct mapping from shopping_mall_system_audit_logs.description. DB allows null, DTO must also.
     */
    description: string | null;

    /**
     * Timestamp when the audit log entry was created
     *
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the audit log entry was last updated
     *
     * @x-autobe-database-schema-property updated_at
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp for soft delete tracking. null means not deleted
     *
     * @x-autobe-database-schema-property deleted_at
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Request parameters for filtering and paginating system audit logs.
   */
  export type IRequest = {
    /**
     * Filter by actor type: customer, seller, admin, or system
     *
     * @x-autobe-specification Filter query parameter for actor type. Accepts values: customer, seller, admin, system.
     */
    actor_type?: string | undefined;

    /**
     * Filter by operation type: create, read, update, delete, login, logout, approve, reject, suspend, or unsuspend
     *
     * @x-autobe-specification Filter query parameter for operation type. Accepts values: create, read, update, delete, login, logout, approve, reject, suspend, unsuspend.
     */
    operation_type?: string | undefined;

    /**
     * Filter by entity type: customer, seller, product, order, review, or other system entities
     *
     * @x-autobe-specification Filter query parameter for entity type. Accepts values: customer, seller, product, order, review, or other system entities.
     */
    entity_type?: string | undefined;

    /**
     * Filter by IP address (supports partial matching)
     *
     * @x-autobe-specification Filter query parameter for IP address. Supports partial matching for flexible searching.
     */
    ip_address?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Filter records created on or after this timestamp (ISO 8601 format)
     *
     * @x-autobe-specification Filter query parameter for date range. Accepts ISO 8601 formatted date-time strings.
     */
    created_at_gte?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter records created on or before this timestamp (ISO 8601 format)
     *
     * @x-autobe-specification Filter query parameter for date range. Accepts ISO 8601 formatted date-time strings.
     */
    created_at_lte?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination (starts at 1)
     *
     * @x-autobe-specification Pagination parameter. Page number for paginated results (1-indexed). Defaults to 1.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of records per page (max 100)
     *
     * @x-autobe-specification Pagination parameter. Maximum number of records per page (max 100). Defaults to 20.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };
}
