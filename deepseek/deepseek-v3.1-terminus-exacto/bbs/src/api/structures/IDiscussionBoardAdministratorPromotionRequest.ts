import { tags } from "typia";

import { IDiscussionBoardUser } from "./IDiscussionBoardUser";

export namespace IDiscussionBoardAdministratorPromotionRequest {
  /**
   * Summary view of administrator promotion requests containing essential information for administrative list displays. Shows basic request details without exposing sensitive administrative review information or complex relations.
   */
  export type IPagination = {
    /**
     * Unique identifier for the administrator promotion request
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_administrator_promotion_requests.id. Primary key identifier for promotion request records.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User-provided justification for seeking administrator status
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from discussion_board_administrator_promotion_requests.reason. User-provided justification text for seeking administrator status.
     */
    reason: string;

    /**
     * Current workflow status: 'pending', 'approved', or 'rejected'
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from discussion_board_administrator_promotion_requests.status. Current workflow status indicating whether the request is pending, approved, or rejected.
     */
    status: string;

    /**
     * Timestamp when the promotion request was submitted
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_administrator_promotion_requests.created_at. Timestamp when the promotion request was initially submitted by the user.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the promotion request was last modified
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from discussion_board_administrator_promotion_requests.updated_at. Timestamp when the promotion request was last modified, including status changes or administrative updates.
     */
    updated_at: string & tags.Format<"date-time">;
  };

  /**
   * Summary view of administrator promotion requests showing essential information for workflow context and audit trail purposes.
   */
  export type ISummary = {
    /**
     * Unique identifier of the promotion request
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_administrator_promotion_requests.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User-provided justification for seeking administrator status (truncated for summary view)
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from discussion_board_administrator_promotion_requests.reason with truncation to 100 characters for summary display.
     */
    reason: string & tags.MaxLength<100>;

    /**
     * Current workflow status of the promotion request
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from discussion_board_administrator_promotion_requests.status. Valid values: 'pending', 'approved', 'rejected'.
     */
    status: string;

    /**
     * Timestamp when the promotion request was submitted
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_administrator_promotion_requests.created_at. Timestamp when the request was submitted.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * User who submitted the promotion request
     *
     * @x-autobe-database-schema-property user
     * @x-autobe-specification Join via discussion_board_user_id foreign key to discussion_board_users table. Returns IDiscussionBoardUser.ISummary to prevent circular references.
     */
    user: IDiscussionBoardUser.ISummary;
  };
}
