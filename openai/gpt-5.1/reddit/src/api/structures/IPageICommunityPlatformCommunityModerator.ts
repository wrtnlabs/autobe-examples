import { IPage } from "./IPage";
import { ICommunityPlatformCommunityModerator } from "./ICommunityPlatformCommunityModerator";

export namespace IPageICommunityPlatformCommunityModerator {
  /**
   * Paginated result wrapper for community moderator account summaries.
   *
   * This type is used as the response body for the PATCH
   * `/communityPlatform/platformAdmin/communityModerators` endpoint, which
   * allows platform administrators to search, filter, and page through
   * community moderator accounts stored in the
   * `community_platform_communitymoderators` Prisma model. It combines
   * page-level metadata with an array of moderator summary DTOs tailored for
   * list displays and bulk review scenarios.
   *
   * The wrapper itself introduces no additional business fields beyond
   * `pagination` and `data`, but it provides a consistent contract for
   * administrative UIs and API consumers that need to navigate across
   * potentially large moderator populations. Each summary entry in `data` can
   * be used as an entry point into more detailed moderator management
   * operations, such as viewing assignments, sessions, and moderation
   * history.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of community
     * moderator accounts.
     *
     * The structure is shared with other paginated responses via
     * `IPage.IPagination`, where `current` is the zero-based page index
     * being returned, `limit` is the maximum number of moderator summaries
     * per page, `records` is the total number of moderators matching the
     * search criteria in `community_platform_communitymoderators`, and
     * `pages` is the total number of pages derived from those counts.
     *
     * Administrative tools use this information to provide paging controls
     * when browsing large sets of moderator accounts through the PATCH
     * `/communityPlatform/platformAdmin/communityModerators` endpoint. The
     * values always reflect the applied filters from
     * `ICommunityPlatformCommunityModerator.IRequest`, not the entire
     * moderator population.
     */
    pagination: IPage.IPagination;

    /**
     * List of community moderator summary DTOs returned for the current
     * page of the search.
     *
     * Each element is an `ICommunityPlatformCommunityModerator.ISummary`
     * object that summarizes a single moderator actor from the
     * `community_platform_communitymoderators` Prisma model. The summary
     * includes key identification and display attributes, along with the
     * resolved account status projection from
     * `community_platform_account_statuses`, enabling quick assessment of a
     * moderator's identity and lifecycle state.
     *
     * This collection reflects the subset of moderators that satisfy the
     * filters, sort order, and pagination limits expressed in
     * `ICommunityPlatformCommunityModerator.IRequest`. It is optimized for
     * list and grid views in administrative consoles, where operators need
     * a concise overview of many moderators rather than full relational
     * detail for each account.
     */
    data: ICommunityPlatformCommunityModerator.ISummary[];
  };
}
