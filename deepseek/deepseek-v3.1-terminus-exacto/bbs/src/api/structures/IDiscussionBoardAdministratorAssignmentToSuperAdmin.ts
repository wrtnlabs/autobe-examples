import { tags } from "typia";

import { IDiscussionBoardSuperAdmin } from "./IDiscussionBoardSuperAdmin";

export namespace IDiscussionBoardAdministratorAssignmentToSuperAdmin {
  /**
   * Summary view of administrator assignment records targeting super admin recipients. Includes assignment type, role transitions, reason, timestamp, and recipient super admin information. Used for listing assignment records in administrative oversight interfaces.
   */
  export type ISummary = {
    /**
     * Unique identifier for the administrator assignment relationship.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_administrator_assignment_to_super_admins.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The user's role before this assignment (member, admin, or super_admin).
     *
     * @x-autobe-database-schema-property administratorAssignment
     * @x-autobe-specification JOIN from discussion_board_administrator_assignments.old_role via discussion_board_administrator_assignment_id FK. Represents the user's role before this assignment.
     */
    old_role: string;

    /**
     * The user's role after this assignment (member, admin, or super_admin).
     *
     * @x-autobe-database-schema-property administratorAssignment
     * @x-autobe-specification JOIN from discussion_board_administrator_assignments.new_role via discussion_board_administrator_assignment_id FK. Represents the user's role after this assignment.
     */
    new_role: string;

    /**
     * Type of assignment performed (promotion, demotion, initial assignment, or system-initiated change).
     *
     * @x-autobe-database-schema-property administratorAssignment
     * @x-autobe-specification JOIN from discussion_board_administrator_assignments.assignment_type via discussion_board_administrator_assignment_id FK. Values: promotion, demotion, initial, system.
     */
    assignment_type: string;

    /**
     * Explanation for why this assignment was made, similar to ban reasons.
     *
     * @x-autobe-database-schema-property administratorAssignment
     * @x-autobe-specification JOIN from discussion_board_administrator_assignments.reason via discussion_board_administrator_assignment_id FK. Nullable field documenting the rationale for the role change.
     */
    reason: string | null;

    /**
     * Timestamp when this assignment record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification JOIN from discussion_board_administrator_assignments.created_at via discussion_board_administrator_assignment_id FK. Timestamp when the assignment record was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The super administrator who received this role assignment.
     *
     * @x-autobe-database-schema-property superAdmin
     * @x-autobe-specification JOIN from discussion_board_super_admins via discussion_board_super_admin_id FK, returning IDiscussionBoardSuperAdmin.ISummary. Computed relationship showing the super admin who received this assignment.
     */
    recipient: IDiscussionBoardSuperAdmin.ISummary;
  };

  /**
   * Search criteria for filtering administrator assignment records targeting super admin recipients. Allows filtering by assignment type, role transitions, assignment reason text, creation date ranges, and pagination controls. Used by super administrators for administrative oversight and audit trail management of role assignments within the platform governance system.
   */
  export type IRequest = {
    /**
     * Filter assignments by type: promotion, demotion, initial assignment, or system-initiated change.
     *
     * @x-autobe-specification Filter by assignment type values. Accepts string values: 'promotion', 'demotion', 'initial', 'system'. When null, no assignment type filtering is applied. Used in SQL WHERE clause: assignment_type IN (provided values).
     */
    assignment_type?: string | null | undefined;

    /**
     * Filter assignments by the user's role before the assignment occurred.
     *
     * @x-autobe-specification Filter by previous role before assignment. Accepts string values: 'member', 'admin', 'super_admin'. When null, no old role filtering is applied. Used in SQL WHERE clause: old_role IN (provided values).
     */
    old_role?: string | null | undefined;

    /**
     * Filter assignments by the user's role after the assignment occurred.
     *
     * @x-autobe-specification Filter by new role after assignment. Accepts string values: 'member', 'admin', 'super_admin'. When null, no new role filtering is applied. Used in SQL WHERE clause: new_role IN (provided values).
     */
    new_role?: string | null | undefined;

    /**
     * Filter assignments by reason text using partial matching search.
     *
     * @x-autobe-specification Filter by assignment reason text using partial matching. When null, no reason filtering is applied. Used in SQL WHERE clause: reason LIKE %provided_text%. Supports case-insensitive text search for assignment rationale documentation.
     */
    reason?: string | null | undefined;

    /**
     * Start date for filtering assignments by creation timestamp range.
     *
     * @x-autobe-specification Start date for creation timestamp range filter. When combined with created_at_end, filters assignments created within the specified date range. Used in SQL WHERE clause: created_at >= provided_start_date. Format: ISO 8601 date-time string.
     */
    created_at_start?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering assignments by creation timestamp range.
     *
     * @x-autobe-specification End date for creation timestamp range filter. When combined with created_at_start, filters assignments created within the specified date range. Used in SQL WHERE clause: created_at <= provided_end_date. Format: ISO 8601 date-time string.
     */
    created_at_end?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for paginated results (1-indexed).
     *
     * @x-autobe-specification Pagination page number (1-indexed). Used to calculate OFFSET for paginated results: OFFSET = (page - 1) * limit. Minimum value: 1. When combined with limit parameter, enables efficient pagination of large result sets.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of assignment records to return per page (1-100).
     *
     * @x-autobe-specification Maximum number of records per page. Used in SQL LIMIT clause to control result set size. Range: 1-100. When combined with page parameter, enables efficient pagination of large result sets. Defaults to system-configured page size if not specified.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
