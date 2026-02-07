import { tags } from "typia";

import { IDiscussionBoardUser } from "./IDiscussionBoardUser";

export namespace IDiscussionBoardAdministrator {
  /**
   * Summary view of administrator assignments showing essential identification information, grade level, activity status, and user details. Suitable for administrative interfaces and promotion workflow displays.
   */
  export type ISummary = {
    /**
     * Unique identifier for the administrator assignment record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_administrators.id. UUID primary key used for unique identification of administrator assignment records.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Current administrator grade level indicating privilege level (regular or super administrator).
     *
     * @x-autobe-database-schema-property grade
     * @x-autobe-specification Direct mapping from discussion_board_administrators.grade. Valid values: 'regular' for regular administrators, 'super' for super administrators.
     */
    grade: string;

    /**
     * Timestamp when the user was first promoted to administrator status.
     *
     * @x-autobe-database-schema-property promoted_at
     * @x-autobe-specification Direct mapping from discussion_board_administrators.promoted_at. Records when the user was first promoted to administrator status.
     */
    promoted_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent grade change (promotion to super admin or demotion to regular admin).
     *
     * @x-autobe-database-schema-property grade_changed_at
     * @x-autobe-specification Direct mapping from discussion_board_administrators.grade_changed_at. Records most recent grade change (promotion to super admin or demotion to regular admin). Null if no grade changes occurred.
     */
    grade_changed_at: (string & tags.Format<"date-time">) | null;

    /**
     * Indicates whether the administrator assignment is currently active.
     *
     * @x-autobe-database-schema-property is_active
     * @x-autobe-specification Direct mapping from discussion_board_administrators.is_active. Boolean flag indicating whether the administrator assignment is currently active. Inactive assignments represent historical records.
     */
    is_active: boolean;

    /**
     * Record creation timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_administrators.created_at. System-generated timestamp when the administrator assignment record was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Record last update timestamp.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from discussion_board_administrators.updated_at. System-generated timestamp when the administrator assignment record was last updated.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * User identity associated with this administrator assignment.
     *
     * @x-autobe-database-schema-property user
     * @x-autobe-specification JOIN from discussion_board_administrators.user_id to discussion_board_users.id. Returns IDiscussionBoardUser.ISummary containing user's display name, bio, and timestamps.
     */
    user: IDiscussionBoardUser.ISummary;
  };
}
