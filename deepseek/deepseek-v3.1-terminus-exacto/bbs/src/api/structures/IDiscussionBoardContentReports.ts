import { tags } from "typia";

import { IDiscussionBoardMember } from "./IDiscussionBoardMember";
import { IDiscussionBoardPost } from "./IDiscussionBoardPost";

export namespace IDiscussionBoardContentReports {
  /**
   * Summary view of a content report for moderation queue context.
   *
   * Provides essential information about a reported content item including
   * reporter identification and reported content context. Used for displaying
   * report context within moderation queue listings and assignments.
   *
   * This enhanced summary includes reporter information for accountability
   * and content context for efficient moderation workflow management. The
   * summary maintains lightweight representation while providing necessary
   * context for queue assignment decisions.
   */
  export type ISummary = {
    /** Primary key identifier for the content report. */
    id: string & tags.Format<"uuid">;

    /** Type of content being reported (e.g., 'post', 'comment', 'user'). */
    report_type: string;

    /**
     * Current status of the report (e.g., 'pending', 'under_review',
     * 'resolved').
     */
    status: string;

    /** Timestamp when the report was created. */
    created_at: string & tags.Format<"date-time">;

    /** Member who submitted the content report. */
    reporter: IDiscussionBoardMember.ISummary;

    /** The reported content being reviewed. */
    content: IDiscussionBoardPost.ISummary;
  };
}
