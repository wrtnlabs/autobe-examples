import { IPage } from "./IPage";
import { ICommunityPlatformCommunityModeratorAssignment } from "./ICommunityPlatformCommunityModeratorAssignment";

export namespace IPageICommunityPlatformCommunityModeratorAssignment {
  /**
   * Paginated result set of community moderator assignment summaries.
   *
   * This DTO wraps a page of
   * `ICommunityPlatformCommunityModeratorAssignment.ISummary` records, which
   * summarize rows from the
   * `community_platform_community_moderator_assignments` table together with
   * their associated community and moderator identities. It is used as the
   * response body for administrative list operations that inspect which
   * moderators are assigned to which communities, or review the assignment
   * history for a specific moderator.
   *
   * The `pagination` field describes the paging context for the overall
   * result set, and the `data` array contains the moderator assignment
   * summary items for the current page only.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Carries the standard pagination metadata (current page, page size,
     * total records, and total pages) for a list of community moderator
     * assignment summaries.
     */
    pagination: IPage.IPagination;

    /**
     * List of community moderator assignment summary records.
     *
     * Each element is an
     * `ICommunityPlatformCommunityModeratorAssignment.ISummary` object that
     * represents a single moderator assignment derived from the
     * `community_platform_community_moderator_assignments` Prisma model,
     * linking a community to a moderator actor through `.ISummary`
     * association types.
     */
    data: ICommunityPlatformCommunityModeratorAssignment.ISummary[];
  };
}
