import { IPage } from "./IPage";
import { ICommunityPlatformCommunityMembershipRequest } from "./ICommunityPlatformCommunityMembershipRequest";

export namespace IPageICommunityPlatformCommunityMembershipRequest {
  /**
   * Paginated result set of community membership request summaries.
   *
   * This DTO wraps a page of
   * `ICommunityPlatformCommunityMembershipRequest.ISummary` records, which
   * summarize rows from the
   * `community_platform_community_membership_requests` table and their key
   * relations (target community and requesting member user). It is used as
   * the response body for list-style operations that allow moderators,
   * platform administrators, or member users to search and page through
   * membership requests with complex filters and sorting.
   *
   * The `pagination` field describes the paging context for the overall
   * result set, and the `data` array contains the summary items for the
   * current page only.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Carries the standard pagination metadata (current page, page size,
     * total records, and total pages) for a list of community membership
     * request summaries.
     */
    pagination: IPage.IPagination;

    /**
     * List of membership request summary records.
     *
     * Each element is an
     * `ICommunityPlatformCommunityMembershipRequest.ISummary` object that
     * represents a single community membership request derived from the
     * `community_platform_community_membership_requests` Prisma model,
     * including its associations to a community and the requesting member
     * user via their respective `.ISummary` relation types.
     */
    data: ICommunityPlatformCommunityMembershipRequest.ISummary[];
  };
}
