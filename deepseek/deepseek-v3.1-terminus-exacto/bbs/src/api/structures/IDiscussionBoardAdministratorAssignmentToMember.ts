import { tags } from "typia";

import { IDiscussionBoardMember } from "./IDiscussionBoardMember";

export namespace IDiscussionBoardAdministratorAssignmentToMember {
  /**
   * Summary view of administrator assignments targeting member actors, showing role transitions and recipient information for administrative oversight and audit trail purposes.
   */
  export type ISummary = {
    /**
     * Unique identifier for the administrator assignment subtype record
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_administrator_assignment_to_members.id. Unique identifier for the assignment subtype record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The user's role before this assignment was performed
     *
     * @x-autobe-specification JOIN from discussion_board_administrator_assignment_to_members.discussion_board_administrator_assignment_id to discussion_board_administrator_assignments.id. Represents the user's role before this assignment (member, admin, or super_admin).
     */
    old_role: string;

    /**
     * The user's role after this assignment was performed
     *
     * @x-autobe-specification JOIN from discussion_board_administrator_assignment_to_members.discussion_board_administrator_assignment_id to discussion_board_administrator_assignments.id. Represents the user's role after this assignment (member, admin, or super_admin).
     */
    new_role: string;

    /**
     * Type of assignment performed (promotion, demotion, initial, system)
     *
     * @x-autobe-specification JOIN from discussion_board_administrator_assignment_to_members.discussion_board_administrator_assignment_id to discussion_board_administrator_assignments.id. Indicates the type of assignment performed (promotion, demotion, initial, system).
     */
    assignment_type: string;

    /**
     * Administrative reason for the role assignment decision
     *
     * @x-autobe-specification JOIN from discussion_board_administrator_assignment_to_members.discussion_board_administrator_assignment_id to discussion_board_administrator_assignments.id. Provides administrative rationale for the role change decision.
     */
    reason?: string | undefined;

    /**
     * Timestamp when this assignment subtype record was created
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_administrator_assignment_to_members.created_at. Records when this assignment subtype relationship was established.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Member who received the administrator assignment
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification JOIN from discussion_board_administrator_assignment_to_members.discussion_board_member_id to discussion_board_members.id. Provides summary information about the member who received the administrator assignment.
     */
    member: IDiscussionBoardMember.ISummary;
  };

  /**
   * Request parameters for searching and filtering administrator assignments targeting member actors. Provides pagination controls and filtering options including assignment type, role transitions, and date ranges for administrative oversight and audit trail review.
   */
  export type IRequest = {
    /**
     * Page number for paginated results (1-indexed)
     *
     * @x-autobe-specification 1-indexed page number for paginated results. Controls which page of assignment records to retrieve from the filtered result set.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page (1-100)
     *
     * @x-autobe-specification Maximum number of assignment records to return per page. Controls the size of the paginated result set with validation constraints (1-100).
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter by assignment type: promotion, demotion, initial, or system
     *
     * @x-autobe-specification Filter by assignment type: 'promotion' (moving to higher role), 'demotion' (moving to lower role), 'initial' (first-time assignment), 'system' (system-initiated change).
     */
    assignment_type?: string | undefined;

    /**
     * Filter by previous role: member, admin, or super_admin
     *
     * @x-autobe-specification Filter by the user's role before the assignment occurred. Possible values: 'member', 'admin', 'super_admin'. Used to track specific role transitions.
     */
    old_role?: string | undefined;

    /**
     * Filter by new role: member, admin, or super_admin
     *
     * @x-autobe-specification Filter by the user's role after the assignment occurred. Possible values: 'member', 'admin', 'super_admin'. Used to track specific role transitions.
     */
    new_role?: string | undefined;

    /**
     * Start date for filtering assignments (inclusive)
     *
     * @x-autobe-specification Start date for filtering assignments within a specific time range. Uses ISO 8601 format to filter assignments created on or after this date.
     */
    start_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering assignments (inclusive)
     *
     * @x-autobe-specification End date for filtering assignments within a specific time range. Uses ISO 8601 format to filter assignments created on or before this date.
     */
    end_date?: (string & tags.Format<"date-time">) | undefined;
  };
}
