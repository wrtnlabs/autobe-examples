import { IPage } from "./IPage";
import { ICommunityPlatformVotingRateLimit } from "./ICommunityPlatformVotingRateLimit";

export namespace IPageICommunityPlatformVotingRateLimit {
  /**
   * Paginated collection of voting rate limit summary records.
   *
   * This schema is used as the response body when listing or searching rate
   * limit windows stored in the `community_platform_voting_rate_limits`
   * Prisma model, for example through the
   * `/communityPlatform/platformAdmin/memberUsers/{memberUserId}/votingRateLimits`
   * endpoint. The `pagination` property provides page-level metadata, and the
   * `data` array contains the `ICommunityPlatformVotingRateLimit.ISummary`
   * objects for the current slice.
   *
   * Administrative tools and internal dashboards rely on this type to
   * inspect, audit, or troubleshoot how voting rate limits are configured and
   * enforced for member users over time, without retrieving all records in a
   * single unbounded query.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this page of voting rate limit summaries.
     *
     * This object follows the shared `IPage.IPagination` contract and
     * includes fields such as current page index, page size, total count,
     * and total pages. It enables clients to navigate through large result
     * sets of rate limit records in a predictable manner.
     */
    pagination: IPage.IPagination;

    /**
     * List of voting rate limit summary records returned for the current
     * page.
     *
     * Each element is an `ICommunityPlatformVotingRateLimit.ISummary` DTO
     * that summarizes a single rate limit window row from the
     * `community_platform_voting_rate_limits` table, typically scoped to a
     * specific member user. These summaries expose key window boundaries
     * and counters so that administrators can understand how voting
     * constraints are currently applied.
     */
    data: ICommunityPlatformVotingRateLimit.ISummary[];
  };
}
