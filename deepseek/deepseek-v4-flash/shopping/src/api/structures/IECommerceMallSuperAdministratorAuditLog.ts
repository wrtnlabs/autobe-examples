import { tags } from "typia";

export namespace IECommerceMallSuperAdministratorAuditLog {
  /**
   * Search and filter criteria for retrieving platform audit logs.
   *
   * Provides filtering parameters to narrow down audit log entries by action type, target entity type, actor type (regular administrator or super administrator), and a date range defined by from/to timestamps. Supports pagination via page and limit parameters, and sort ordering by creation timestamp. All filter parameters are optional — omitting all filters returns the complete audit log sorted by newest entries first.
   */
  export type IRequest = {
    /**
     * Comma-separated list of action types to filter audit log entries by.
     *
     * Filters the unified audit log to only include entries whose action type matches one of the specified values. Action types include force_cancel_order_item, force_refund_order_item, ban_customer, unban_customer, suspend_seller, unsuspend_seller, approve_seller, reject_seller, delete_product, create_category, edit_category, delete_category, admin_promotion, admin_demotion, admin_request_approval, and admin_request_rejection. When omitted, entries of all action types are returned.
     *
     * @x-autobe-specification Comma-separated list of action types. Maps to action_type in e_commerce_mall_administrator_audit_logs and action in e_commerce_mall_super_administrator_audit_logs. When specified, filter UNION results to only include entries whose action matches one of the listed values.
     */
    action?: string | undefined;

    /**
     * Entity type to filter audit log entries by.
     *
     * Restricts the results to only include entries where the target entity type matches the specified value. Supported target types include order_item, customer, seller, product, category, seller_approval_request, administrator, and admin_registration_request. When omitted, entries targeting any entity type are returned.
     *
     * @x-autobe-specification Entity type filter. Maps to target_type in both audit log tables. When specified, filter UNION results to only include entries where target_type matches the given value.
     */
    targetType?: string | undefined;

    /**
     * Actor type to restrict the audit log results to.
     *
     * Use 'administrator' to return only actions performed by regular administrators, 'superAdministrator' for only super administrator actions, or 'both' (default when omitted) to include entries from both actor types. This filter determines which underlying audit log tables are queried — the regular administrator audit log table, the super administrator audit log table, or both combined.
     *
     * @x-autobe-specification Actor type discriminator. 'administrator' queries only e_commerce_mall_administrator_audit_logs, 'superAdministrator' queries only e_commerce_mall_super_administrator_audit_logs, 'both' (default when omitted) UNIONs both tables.
     */
    actorType?: string | undefined;

    /**
     * Start of the date range filter for audit log entries.
     *
     * Only entries with a created_at timestamp greater than or equal to this ISO 8601 datetime value are returned. Use this together with the 'to' parameter to define a time-bounded search window. When omitted, no lower bound is applied.
     *
     * @x-autobe-specification ISO 8601 datetime. Apply filter: created_at >= from in both audit log tables. When omitted, no lower bound is applied.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of the date range filter for audit log entries.
     *
     * Only entries with a created_at timestamp less than or equal to this ISO 8601 datetime value are returned. Use this together with the 'from' parameter to define a time-bounded search window. When omitted, no upper bound is applied.
     *
     * @x-autobe-specification ISO 8601 datetime. Apply filter: created_at <= to in both audit log tables. When omitted, no upper bound is applied.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for paginated results.
     *
     * Indicates which page of results to return. Page numbering starts at 1. The total number of pages available is returned in the pagination metadata of the response. Defaults to 1 when omitted.
     *
     * @x-autobe-specification Page number for pagination. Defaults to 1. Used to calculate offset: (page - 1) * limit. Minimum value is 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page.
     *
     * Defines the upper bound on how many audit log entries are returned in a single page. The actual number of records may be less than this value on the final page or when total records are fewer than the limit. Defaults to 20 when omitted. Maximum allowed value is 100.
     *
     * @x-autobe-specification Maximum records per page. Defaults to 20. Maximum allowed is 100. Used as the LIMIT clause in queries.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort order for results by creation timestamp.
     *
     * 'desc' (default) returns the newest entries first, listing the most recent administrative actions at the top. 'asc' returns the oldest entries first for chronological review of the audit trail.
     *
     * @x-autobe-specification Sort order on created_at. 'desc' (default) sorts newest first (ORDER BY created_at DESC), 'asc' sorts oldest first (ORDER BY created_at ASC).
     */
    sort?: string | undefined;
  };

  /**
   * Summary representation of a platform audit log entry, combining actions from both regular administrators and super administrators into a unified view.
   *
   * Each entry captures a single administrative action recorded in the platform's immutable audit trail. The actor_type field discriminates whether the action was performed by a regular administrator or a super administrator, with the actor's email provided for identification. The action field contains the normalized action type (e.g., seller_suspension, admin_promotion, force_cancel_order_item). The polymorphic target_type and target_id fields reference the affected entity (customer, seller, product, order item, category, administrator, etc.), enabling cross-referencing with the target record.
   */
  export type ISummary = {
    /**
     * The unique identifier for this audit log entry.
     *
     * This UUID primary key uniquely identifies a single administrative action recorded in the platform's immutable audit trail, enabling precise cross-referencing and retrieval of individual audit records. It originates from the source audit log table (either regular administrator or super administrator) where the action was originally recorded.
     *
     * @x-autobe-specification Direct mapping from the `id` column of either e_commerce_mall_administrator_audit_logs or e_commerce_mall_super_administrator_audit_logs, depending on the source table of each record. UUID primary key from the originating audit log table.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The type of administrative action that was performed.
     *
     * This field contains the normalized action type identifying what specific administrative operation was executed. Examples include: seller_suspension, seller_unsuspension, approve_seller, reject_seller, customer_ban, customer_unban, seller_ban, force_cancel_order_item, force_refund_order_item, delete_product, create_category, edit_category, delete_category, admin_promotion, admin_demotion, admin_request_approval, and admin_request_rejection.
     *
     * @x-autobe-specification Normalized from e_commerce_mall_administrator_audit_logs.action_type (snake_case, e.g., force_cancel_order_item) or e_commerce_mall_super_administrator_audit_logs.action (snake_case). Map both source columns to the same normalized 'action' field. Keep the same snake_case value used in both source tables.
     */
    action: string;

    /**
     * The type of administrator who performed this action.
     *
     * This discriminator field indicates whether the action was performed by a regular administrator ('administrator') or a super administrator ('superAdministrator'), enabling unified querying across both regular and super administrator audit log tables. When the value is 'administrator', the actor_id references e_commerce_mall_administrators; when 'superAdministrator', it references e_commerce_mall_super_administrators.
     *
     * @x-autobe-specification Computed constant value: set to 'administrator' when the record originates from e_commerce_mall_administrator_audit_logs, and 'superAdministrator' when the record originates from e_commerce_mall_super_administrator_audit_logs. This discriminator enables downstream consumers to know which audit table the record came from and which actor_id resolution to use.
     */
    actor_type: string;

    /**
     * The unique identifier of the administrator who performed this action.
     *
     * References the administrator or super administrator account that executed the action. For regular administrator actions (actor_type: 'administrator'), this is the UUID from the administrators table. For super administrator actions (actor_type: 'superAdministrator'), this is the UUID from the super administrators table.
     *
     * @x-autobe-specification Maps to e_commerce_mall_administrator_audit_logs.e_commerce_mall_administrator_id for regular administrator records, or e_commerce_mall_super_administrator_audit_logs.e_commerce_mall_super_administrator_id for super administrator records. The actor_type field determines which FK column to use.
     */
    actor_id: string & tags.Format<"uuid">;

    /**
     * The email address of the administrator who performed this action.
     *
     * Provides a human-readable identifier for the acting administrator, sourced from the corresponding administrator account record via a join on the actor's foreign key. This enables quick identification of who performed the action without requiring a separate lookup.
     *
     * @x-autobe-specification Computed via LEFT JOIN: for regular administrator records, join e_commerce_mall_administrator_audit_logs.e_commerce_mall_administrator_id to e_commerce_mall_administrators.id and extract email. For super administrator records, join e_commerce_mall_super_administrator_audit_logs.e_commerce_mall_super_administrator_id to e_commerce_mall_super_administrators.id and extract email.
     */
    actor_email: string;

    /**
     * The type of entity that was the target of this administrative action.
     *
     * This polymorphic discriminator identifies the kind of entity that was affected. Examples include: order_item, customer, seller, product, category, seller_approval_request, admin_registration_request, and administrator. This field enables entity-scoped queries of the audit trail, such as retrieving all actions performed on a particular entity type.
     *
     * @x-autobe-specification Direct mapping from the `target_type` column of either source table (e_commerce_mall_administrator_audit_logs or e_commerce_mall_super_administrator_audit_logs). Both tables use the same polymorphic target_type column with the same naming convention.
     */
    target_type: string;

    /**
     * The unique identifier of the specific entity that this action was performed on.
     *
     * Stores the UUID of the affected entity (e.g., the customer_id for a ban action, the order_item_id for a force-cancel action, the seller_id for a suspension action). Used together with target_type to polymorphically reference any platform entity, enabling complete cross-referencing with the affected record for audit trail traceability.
     *
     * @x-autobe-specification Direct mapping from the `target_id` column of either source table (e_commerce_mall_administrator_audit_logs or e_commerce_mall_super_administrator_audit_logs). Both tables use the same polymorphic target_id column with UUID format.
     */
    target_id: string & tags.Format<"uuid">;

    /**
     * An optional textual explanation for why this action was taken.
     *
     * Required for certain actions such as seller registration rejections, customer bans, product deletions, and admin request rejections to provide transparency and justification for the administrative decision. May be null for self-explanatory actions where the action type alone provides sufficient context.
     *
     * @x-autobe-specification Direct mapping from the `reason` column of either source table. Both tables have an optional nullable reason field. Pass through as-is, preserving null for actions where no reason was provided.
     */
    reason: string | null;

    /**
     * The timestamp when this audit log entry was created.
     *
     * Represents the exact moment the administrative action was performed and recorded in the audit trail. This timestamp enables chronological ordering of audit events, time-based filtering, and historical analysis of administrative activity on the platform.
     *
     * @x-autobe-specification Direct mapping from the `created_at` column of either source table (e_commerce_mall_administrator_audit_logs or e_commerce_mall_super_administrator_audit_logs). Both tables use timestamptz for this field.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
