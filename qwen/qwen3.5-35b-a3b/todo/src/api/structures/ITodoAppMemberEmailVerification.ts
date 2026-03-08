import { tags } from "typia";

import { ITodoAppMember } from "./ITodoAppMember";

export namespace ITodoAppMemberEmailVerification {
  /**
   * Email verification summary record containing verification metadata and member association. Used in list views and summaries without exposing sensitive token values.
   */
  export type ISummary = {
    /**
     * Unique identifier of the email verification token.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_member_email_verifications.id (UUID). Primary identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The member account that owns this verification token.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Join via todo_app_member_id to todo_app_members.id. Returns ISummary.
     */
    member: ITodoAppMember.ISummary;

    /**
     * Timestamp when this verification token expires and becomes invalid.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from todo_app_member_email_verifications.expires_at (timestamp with timezone).
     */
    expiresAt: string & tags.Format<"date-time">;

    /**
     * Whether this verification token has been consumed.
     *
     * @x-autobe-database-schema-property used
     * @x-autobe-specification Direct mapping from todo_app_member_email_verifications.used (boolean).
     */
    used: boolean;

    /**
     * Timestamp when the token was used, or null if unused.
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Direct mapping from todo_app_member_email_verifications.used_at (nullable timestamp). Null if token not used.
     */
    usedAt?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when this verification token was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from todo_app_member_email_verifications.created_at (timestamp with timezone). Immutable.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this verification token was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from todo_app_member_email_verifications.updated_at (timestamp with timezone). Automatically updated on modifications.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp, or null if the record is active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from todo_app_member_email_verifications.deleted_at (nullable timestamp). Null indicates active record.
     */
    deletedAt: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Request parameters for retrieving a paginated and filtered list of email verification records.
   */
  export type IRequest = {
    /**
     * Filter by verification status (pending, completed, or expired).
     *
     * @x-autobe-specification Filter by verification status. Accepts: "pending" (tokens not yet used), "completed" (tokens that have been used), or "expired" (tokens past their expiration date). Used to narrow results to a specific verification state.
     */
    status?: "pending" | "completed" | "expired" | undefined;

    /**
     * Filter verifications created after this datetime (inclusive).
     *
     * @x-autobe-specification Filter records where created_at >= value. ISO 8601 datetime format. Excludes verifications created before this timestamp.
     */
    createdAfter?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter verifications created before this datetime (inclusive).
     *
     * @x-autobe-specification Filter records where created_at <= value. ISO 8601 datetime format. Excludes verifications created after this timestamp.
     */
    createdBefore?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by specific member's ID (UUID).
     *
     * @x-autobe-specification Filter by specific member's verification records. UUID format matching todo_app_members.id. Only returns verifications belonging to this member.
     */
    memberId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Partial match filter on member's email address (1-256 characters).
     *
     * @x-autobe-specification Partial match filter on member's email address (todo_app_members.email). String value 1-256 characters. Returns verifications for members whose email contains this substring.
     */
    memberEmail?:
      | (string & tags.MinLength<1> & tags.MaxLength<256>)
      | undefined;

    /**
     * Cursor token for cursor-based pagination.
     *
     * @x-autobe-specification Cursor token for cursor-based pagination. Returned in previous page response. Used to fetch the next page of results. Optional - when null/omitted, starts from beginning.
     */
    cursor?: string | undefined;

    /**
     * Number of records per page (1-100, default: 50).
     *
     * @x-autobe-specification Number of records to return per page. Integer between 1 and 100. Default is 50. Controls the batch size of results returned in each page.
     */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Pagination direction (forward or backward).
     *
     * @x-autobe-specification Pagination direction. Accepts: "forward" (next page) or "backward" (previous page). Used with cursor for navigating paginated results.
     */
    direction?: "forward" | "backward" | undefined;

    /**
     * Field to sort results by (createdAt, expiresAt, or status).
     *
     * @x-autobe-specification Field to sort results by. Accepts: "createdAt" (created_at column), "expiresAt" (expires_at column), or "status" (status column). Must be used with sortOrder.
     */
    sortBy?: "createdAt" | "expiresAt" | "status" | undefined;

    /**
     * Sort order direction (asc or desc).
     *
     * @x-autobe-specification Sort order direction. Accepts: "asc" (ascending, A-Z / oldest first) or "desc" (descending, Z-A / newest first). Must be used with sortBy.
     */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * Page number to retrieve (1-indexed).
     *
     * @x-autobe-specification 1-indexed page number (alternative pagination method). Defaults to 1 if null/omitted. Requesting beyond available pages returns empty results with valid pagination metadata.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum records per page.
     *
     * @x-autobe-specification Maximum records per page (alternative pagination method). Defaults to 100 if null/omitted. Server may enforce upper bounds to prevent excessive resource consumption.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
