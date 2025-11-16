import { IPage } from "./IPage";
import { ICommunityPlatformCommunityRule } from "./ICommunityPlatformCommunityRule";

export namespace IPageICommunityPlatformCommunityRule {
  /**
   * Paginated collection of structured community rule summaries for a
   * specific community or rule search context.
   *
   * This DTO is the standard response envelope for endpoints that list rules
   * from `community_platform_community_rules`, including those that support
   * filtering by community, rule category, activity status, and search
   * keywords. It allows clients to efficiently retrieve small slices of a
   * potentially large rule set while preserving full information about how
   * the underlying result set is paginated.
   *
   * The `pagination` member describes the paging state and total size of the
   * rule collection, whereas the `data` array contains
   * `ICommunityPlatformCommunityRule.ISummary` items that can be rendered
   * directly in rule listing UIs, community governance views, and moderation
   * tools without additional queries.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current page of community rule results.
     *
     * This object adheres to the shared `IPage.IPagination` contract and
     * records the current page number, page size, total rule count, and
     * total page count produced by a query over
     * `community_platform_community_rules` (optionally filtered by
     * community, category, or activity state).
     *
     * Clients use these values to render paging controls, determine whether
     * further pages of rules can be requested, and maintain consistent
     * navigation across rule management and governance UIs.
     */
    pagination: IPage.IPagination;

    /**
     * Array of community rule summaries returned for the requested page.
     *
     * Each element is an `ICommunityPlatformCommunityRule.ISummary` DTO
     * that represents a single structured rule defined in
     * `community_platform_community_rules`, typically enriched with
     * classification information from
     * `community_platform_community_rule_categories` and community context
     * from `community_platform_communities`.
     *
     * These summaries are specifically shaped for index views,
     * configuration screens, and governance pages, providing concise
     * information such as rule title, summary text, category, ordering, and
     * active flag without loading the full rule body or audit history.
     */
    data: ICommunityPlatformCommunityRule.ISummary[];
  };
}
