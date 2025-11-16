import { IPage } from "./IPage";
import { ICommunityPlatformCommentVote } from "./ICommunityPlatformCommentVote";

export namespace IPageICommunityPlatformCommentVote {
  /**
   * Paginated collection of comment vote summary records.
   *
   * This schema represents a single page of results when searching or listing
   * rows from the `community_platform_comment_votes` Prisma model, typically
   * via moderator or platform administrator tooling. The `pagination`
   * property exposes standard page metadata, while the `data` array contains
   * the corresponding `ICommunityPlatformCommentVote.ISummary` objects for
   * this slice.
   *
   * Clients use this type when consuming endpoints such as
   * `/communityPlatform/communityModerator/commentVotes` or
   * `/communityPlatform/platformAdmin/commentVotes` to inspect voting
   * behavior, analyze engagement, or investigate potential abuse patterns
   * without loading the entire dataset at once.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this page of comment vote summaries.
     *
     * This object provides information such as the current page index, page
     * size, total record count, and total number of pages. It mirrors the
     * platform-wide `IPage.IPagination` structure so that UI components and
     * clients can handle pagination in a consistent way across different
     * list endpoints.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of comment vote summary records returned for the
     * current page.
     *
     * Each element is an `ICommunityPlatformCommentVote.ISummary` object
     * representing a single vote that a member user has cast on a comment
     * or reply. Together with the `pagination` block, this array allows
     * moderators and platform administrators to review voting behavior over
     * comments retrieved from the `community_platform_comment_votes` table
     * in a paginated fashion.
     */
    data: ICommunityPlatformCommentVote.ISummary[];
  };
}
