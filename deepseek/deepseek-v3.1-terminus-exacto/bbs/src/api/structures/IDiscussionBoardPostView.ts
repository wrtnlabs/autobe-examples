import { tags } from "typia";

import { IDiscussionBoardMember } from "./IDiscussionBoardMember";
import { IDiscussionBoardPost } from "./IDiscussionBoardPost";

export namespace IDiscussionBoardPostView {
  /**
   * Summary view of post view tracking for list displays and engagement
   * analytics.
   *
   * Provides essential information about post views including the viewing
   * member and timestamp. Used in aggregated views and analytics dashboards
   * where full view details are not required.
   *
   * This schema demonstrates proper relation handling with association
   * relationships. Both member and post are independent entities that provide
   * context to the view record. The use of .ISummary types ensures circular
   * reference prevention and follows the universal rule for belongs-to
   * relationships.
   *
   * Optimized for performance by excluding soft delete timestamps and update
   * timestamps that are not typically needed in summary displays.
   */
  export type ISummary = {
    /** Unique identifier for the post view record. */
    id: string & tags.Format<"uuid">;

    /**
     * Member who viewed the post. This is an association relationship where
     * the member exists independently and provides contextual information
     * about who viewed the content.
     *
     * The member reference uses the .ISummary type to prevent circular
     * references and ensure efficient data retrieval. This follows the
     * universal rule that all belongs-to relationships must use .ISummary
     * types for reference entities.
     */
    member: IDiscussionBoardMember.ISummary;

    /**
     * Post that was viewed. This is an association relationship where the
     * post exists independently and provides contextual information about
     * what content was viewed.
     *
     * The post reference uses the .ISummary type to prevent circular
     * references and ensure efficient data retrieval. This follows the
     * universal rule that all belongs-to relationships must use .ISummary
     * types for reference entities.
     */
    post: IDiscussionBoardPost.ISummary;

    /** Timestamp when the post view was recorded. */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Search and pagination parameters for filtering discussion board post view
   * records.
   *
   * Supports comprehensive filtering capabilities for post view analytics
   * including member-specific views, date ranges, and pagination controls.
   * Used by moderators to analyze engagement patterns and user behavior.
   *
   * The operation supports sorting by creation date or member information
   * with configurable page sizes for optimal performance.
   */
  export type IRequest = {
    /** Page number for pagination, starting from 1. */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /** Number of records per page, limited to 100 maximum. */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /** Field to sort results by. */
    order_by?: "created_at" | "member" | undefined;

    /** Sort direction for results. */
    order?: "asc" | "desc" | undefined;

    /** Filter views by specific member ID. */
    member_id?: (string & tags.Format<"uuid">) | undefined;

    /** Filter views from this date/time onwards. */
    date_from?: (string & tags.Format<"date-time">) | undefined;

    /** Filter views up to this date/time. */
    date_to?: (string & tags.Format<"date-time">) | undefined;
  };
}
