import { tags } from "typia";

export namespace IEcommerceMallSuperAdminAuditLogMetadatum {
  /**
   * Summary representation of a super administrator audit log metadata entry for list display, showing key-value pairs of audit context.
   */
  export type ISummary = {
    /**
     * Primary key of the metadata entry.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_super_admin_audit_log_metadata.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Metadata property name identifying the type of metadata (e.g., previous_state, new_state, reason, target_entity_type).
     *
     * @x-autobe-database-schema-property key
     * @x-autobe-specification Direct mapping from ecommerce_mall_super_admin_audit_log_metadata.key. Stores metadata property name.
     */
    key: string;

    /**
     * Metadata property value containing the actual data for this metadata entry.
     *
     * @x-autobe-database-schema-property value
     * @x-autobe-specification Direct mapping from ecommerce_mall_super_admin_audit_log_metadata.value. Stores metadata property value.
     */
    value: string;
  };
}
