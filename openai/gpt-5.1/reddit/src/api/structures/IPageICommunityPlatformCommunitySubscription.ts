import { IPage } from "./IPage";
import { ICommunityPlatformCommunitySubscription } from "./ICommunityPlatformCommunitySubscription";

export namespace IPageICommunityPlatformCommunitySubscription {
  /**
   * Paginated collection of community subscription summaries sourced from
   * `community_platform_community_subscriptions`.
   *
   * This wrapper is returned by subscription search endpoints such as
   * `/communityPlatform/memberUser/subscriptions`,
   * `/communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions`,
   * and
   * `/communityPlatform/platformAdmin/communities/{communityId}/subscriptions`.
   * It pairs generic pagination information with a page of
   * `ICommunityPlatformCommunitySubscription.ISummary` rows so that client
   * applications can efficiently render and navigate lists of subscriptions
   * in account settings, administrative tools, and community analytics
   * views.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the subscription search result.
     *
     * Provides the current page number, page size, total number of
     * subscription records that match the search criteria, and the total
     * page count. This enables clients to build paging controls when
     * listing community subscriptions for a member user, a community, or
     * platform‑wide searches.
     */
    pagination: IPage.IPagination;

    /**
     * List of community subscription summary records for the current page.
     *
     * Each item is an `ICommunityPlatformCommunitySubscription.ISummary`
     * that represents a single subscription relationship between a member
     * user and a community, including identifiers, basic community summary
     * information, and key subscription metadata such as mute and
     * notification flags.
     */
    data: ICommunityPlatformCommunitySubscription.ISummary[];
  };
}
