import { IPage } from "./IPage";
import { ICommunityPlatformCommunityMembership } from "./ICommunityPlatformCommunityMembership";

export namespace IPageICommunityPlatformCommunityMembership {
  /**
   * Paginated collection of community membership summaries for community- or
   * member‑scoped listing operations.
   *
   * This page type is used as the standard response envelope when querying
   * the `community_platform_community_memberships` dataset through endpoints
   * such as `PATCH
   * /communityPlatform/communityModerator/communities/{communityIdentifier}/memberships`
   * and `PATCH
   * /communityPlatform/memberUser/memberUsers/{memberUserId}/communityMemberships`.
   * It encapsulates both the paging metadata and the list of
   * `ICommunityPlatformCommunityMembership.ISummary` records that match the
   * search filters supplied in the corresponding request DTO.
   *
   * By combining pagination details in the `pagination` property with
   * membership summaries in the `data` array, this schema enables clients to
   * efficiently traverse large membership sets, whether the caller is
   * inspecting who belongs to a particular community, reviewing a member
   * user’s historical memberships, or supporting moderation workflows that
   * rely on membership state and timelines.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current window of community
     * membership records included in this response.
     *
     * The structure of this object follows `IPage.IPagination`, exposing
     * fields such as the current page index, page size limit, total number
     * of membership records that match the applied filters, and the total
     * number of pages implied by those values. Clients use this information
     * to implement paging controls in membership management and moderation
     * interfaces, allowing operators to step through large sets of
     * memberships without loading the entire dataset at once.
     */
    pagination: IPage.IPagination;

    /**
     * List of community membership summaries included in the current page
     * of results.
     *
     * Each element is an `ICommunityPlatformCommunityMembership.ISummary`
     * DTO that represents a single logical membership linking a member user
     * to a community, derived primarily from the
     * `community_platform_community_memberships` Prisma model and enriched
     * with lightweight member and community summaries. These summaries are
     * optimized for list views in community dashboards, moderator tools,
     * and user profile pages where high‑level membership state, join
     * timestamps, and basic identity information are needed.
     *
     * The exact set of memberships returned in this array depends on the
     * search and filter criteria applied in the corresponding
     * `ICommunityPlatformCommunityMembership.IRequest` payload, such as
     * `is_active`, temporal ranges for `joined_at` or `ended_at`, and
     * whether soft‑deleted rows are included. Together with `pagination`,
     * this array forms a complete page of membership data that can be
     * iterated over to review, audit, or manage how users participate in
     * specific communities across the platform.
     */
    data: ICommunityPlatformCommunityMembership.ISummary[];
  };
}
