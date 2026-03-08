import { IDiscussionBoardAdministratorRequest } from "./IDiscussionBoardAdministratorRequest";
import { IDiscussionBoardBanRecord } from "./IDiscussionBoardBanRecord";

export namespace IDiscussionBoardMemberSession {
  /**
   * Comprehensive activity summary for authenticated members including their ban history, administrator privilege requests, and login session activity.
   */
  export type ISummary = {
    /**
     * List of ban records for this user, sorted by banned_at descending
     *
     * @x-autobe-specification Aggregates from discussion_board_ban_records where discussion_board_member_id = auth_member_id. Includes ban/unban status, reasons, and timestamps. Sorted by banned_at descending.
     */
    banRecords: IDiscussionBoardBanRecord.ISummary[];

    /**
     * List of administrator requests submitted by this user, sorted by submitted_at descending
     *
     * @x-autobe-specification Aggregates from discussion_board_administrator_requests where submitter_member_id = auth_member_id. Includes request status, submission dates, and processing history. Sorted by submitted_at descending.
     */
    administratorRequests: IDiscussionBoardAdministratorRequest.ISummary[];

    /**
     * List of recent login sessions for this user, sorted by created_at descending
     *
     * @x-autobe-specification Aggregates from discussion_board_member_sessions where discussion_board_member_id = auth_member_id. Includes login timestamps, session identifiers, and IP addresses. Sorted by created_at descending.
     */
    sessionActivity: IDiscussionBoardMemberSession.ISummary[];
  };
}
