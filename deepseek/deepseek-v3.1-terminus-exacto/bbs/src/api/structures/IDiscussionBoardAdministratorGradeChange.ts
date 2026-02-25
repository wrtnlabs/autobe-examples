import { tags } from "typia";

import { IDiscussionBoardAdmin } from "./IDiscussionBoardAdmin";

export namespace IDiscussionBoardAdministratorGradeChange {
  /**
   * Summary view of administrator grade change records showing grade transitions, timestamps, and involved administrators. Provides essential information for browsing grade change history without full details.
   */
  export type ISummary = {
    /**
     * Unique identifier for the grade change record
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_administrator_grade_changes.id. Primary key identifier for grade change records.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Previous administrator grade before the grade change
     *
     * @x-autobe-database-schema-property old_grade
     * @x-autobe-specification Direct mapping from discussion_board_administrator_grade_changes.old_grade. Represents the administrator's grade before the change occurred.
     */
    old_grade: string;

    /**
     * New administrator grade after the grade change
     *
     * @x-autobe-database-schema-property new_grade
     * @x-autobe-specification Direct mapping from discussion_board_administrator_grade_changes.new_grade. Represents the administrator's grade after the change was applied.
     */
    new_grade: string;

    /**
     * Reason for the grade change as provided by the performing administrator
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from discussion_board_administrator_grade_changes.reason. Contains the justification or explanation provided by the administrator performing the grade change.
     */
    reason: string;

    /**
     * Timestamp when the grade change was recorded
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_administrator_grade_changes.created_at. Records when the grade change was officially recorded in the system.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Administrator whose grade was changed
     *
     * @x-autobe-database-schema-property administrator
     * @x-autobe-specification Join from discussion_board_administrator_grade_changes.administrator_id to discussion_board_admins.id. Returns IDiscussionBoardAdmin.ISummary showing the administrator whose grade was changed.
     */
    administrator: IDiscussionBoardAdmin.ISummary;

    /**
     * Administrator who performed the grade change
     *
     * @x-autobe-database-schema-property changedByAdministrator
     * @x-autobe-specification Join from discussion_board_administrator_grade_changes.changed_by_administrator_id to discussion_board_admins.id. Returns IDiscussionBoardAdmin.ISummary showing the administrator who performed the grade change.
     */
    changed_by_administrator: IDiscussionBoardAdmin.ISummary;
  };

  /**
   * Search criteria and pagination parameters for filtering administrator grade change records. Provides comprehensive filtering capabilities including target administrator, performing administrator, date ranges, grade transitions, and text search on reasons. All filters are optional to support flexible querying of the audit trail.
   */
  export type IRequest = {
    /**
     * Filter by the administrator whose grade was changed
     *
     * @x-autobe-database-schema-property administrator_id
     * @x-autobe-specification Filter by target administrator UUID. Matches records where administrator_id equals the specified value. Null value disables this filter.
     */
    administrator_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Filter by the administrator who performed the grade change
     *
     * @x-autobe-database-schema-property changed_by_administrator_id
     * @x-autobe-specification Filter by performing administrator UUID. Matches records where changed_by_administrator_id equals the specified value. Null value disables this filter.
     */
    changed_by_administrator_id?:
      | (string & tags.Format<"uuid">)
      | null
      | undefined;

    /**
     * Filter by the previous grade before the change
     *
     * @x-autobe-database-schema-property old_grade
     * @x-autobe-specification Filter by previous administrator grade before the change. Matches records where old_grade equals the specified value. Null value disables this filter.
     */
    old_grade?: string | null | undefined;

    /**
     * Filter by the new grade after the change
     *
     * @x-autobe-database-schema-property new_grade
     * @x-autobe-specification Filter by new administrator grade after the change. Matches records where new_grade equals the specified value. Null value disables this filter.
     */
    new_grade?: string | null | undefined;

    /**
     * Filter by the start date of the creation timestamp range
     *
     * @x-autobe-specification Filter by start date of the creation timestamp range. Matches records where created_at >= specified value. Null value disables this filter.
     */
    created_at_start?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter by the end date of the creation timestamp range
     *
     * @x-autobe-specification Filter by end date of the creation timestamp range. Matches records where created_at <= specified value. Null value disables this filter.
     */
    created_at_end?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter by text search in the reason field
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Filter by partial text matching in the reason field. Uses case-insensitive pattern matching. Null value disables this filter.
     */
    reason?: string | null | undefined;

    /**
     * Page number for paginated results (1-indexed)
     *
     * @x-autobe-specification Pagination control specifying which page of results to return. Page numbering starts from 1. Required for paginated results.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page
     *
     * @x-autobe-specification Pagination control specifying maximum number of records per page. Limits the size of the result set returned. Required for paginated results.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Request body for creating an administrator grade change record, specifically for demoting super administrators to regular administrators.
   */
  export type ICreate = {
    reason: string;
  };
}
