import { tags } from "typia";

export namespace IShoppingMallSession {
  /**
   * A concise representation of the current authenticated administrator session, including its identifier and time bounds so the client can determine whether the session remains valid and which administrator identity the session belongs to.
   */
  export type ISummary = {
    /**
     * Session identifier for the administrator session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping: shopping_mall_admin_sessions.id -> IShoppingMallSession.ISummary.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * True if this session summary represents an administrator-authenticated session.
     *
     * @x-autobe-specification When constructing IShoppingMallSession.ISummary from shopping_mall_admin_sessions, set adminSession=true. This table represents administrator sessions, so the flag is always true in this context.
     */
    adminSession?: boolean | undefined;

    /**
     * Member (customer/seller) identifier when the session is a member session; null for administrator sessions.
     *
     * @x-autobe-specification When constructing from shopping_mall_admin_sessions, return null for memberId because this table cannot produce a member identifier.
     */
    memberId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Administrator identifier that owns this session.
     *
     * @x-autobe-database-schema-property shopping_mall_admin_id
     * @x-autobe-specification Direct mapping: shopping_mall_admin_sessions.shopping_mall_admin_id -> IShoppingMallSession.ISummary.adminId.
     */
    adminId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Time when the session expires; the session must be treated as invalid after this moment.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping: shopping_mall_admin_sessions.expired_at -> IShoppingMallSession.ISummary.expiredAt (ISO 8601 date-time).
     */
    expiredAt: string & tags.Format<"date-time">;

    /**
     * Soft-delete timestamp for the session. Null means the session record is not soft-deleted.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping: shopping_mall_admin_sessions.deleted_at -> IShoppingMallSession.ISummary.deletedAt. If deleted_at is NULL, deletedAt is null.
     */
    deletedAt: (string & tags.Format<"date-time">) | null;

    /**
     * Time when the session record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping: shopping_mall_admin_sessions.created_at -> IShoppingMallSession.ISummary.createdAt (ISO 8601 date-time).
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Time when the session record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping: shopping_mall_admin_sessions.updated_at -> IShoppingMallSession.ISummary.updatedAt (ISO 8601 date-time).
     */
    updatedAt: string & tags.Format<"date-time">;
  };

  /**
   * Pagination request parameters for retrieving a page of shopping-mall session records relevant to the caller. Supports optional `page` (1-indexed) and `limit` (max records per page).
   */
  export type IRequest = {
    /**
     * Target page number to retrieve (1-indexed). Defaults to 1 when omitted or null.
     *
     * @x-autobe-specification Treat `page` as a 1-indexed pagination control. Implementation default: if `page` is null/undefined, use page=1. Validate it is a non-negative integer when provided. Apply it to the query offset as offset=(page-1)*limit.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page. Defaults to 100 when omitted or null.
     *
     * @x-autobe-specification Treat `limit` as the maximum number of records per page. Implementation default: if `limit` is null/undefined, use limit=100. Validate it is a non-negative integer when provided. Apply it as the query page size, and optionally enforce an upper bound for resource protection.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
