import { IPage } from "./IPage";
import { ICommunityPlatformCommunityRuleCategory } from "./ICommunityPlatformCommunityRuleCategory";

export namespace IPageICommunityPlatformCommunityRuleCategory {
  /**
   * Paginated list of community rule category summaries backed by
   * `community_platform_community_rule_categories`.
   *
   * This wrapper combines pagination metadata (via `IPage.IPagination`) with
   * an array of `ICommunityPlatformCommunityRuleCategory.ISummary` records.
   * It is used by endpoints that search and list rule categories so that
   * clients can page through the global catalog, inspect key attributes like
   * code and name, and select appropriate categories when defining or
   * updating community-specific rules.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this community rule category result set.
     *
     * This object follows the `IPage.IPagination` schema and exposes fields
     * such as `current` (current page index), `limit` (maximum number of
     * items per page), `records` (total number of matching rule categories
     * in the database), and `pages` (total number of pages). Clients use
     * this information to drive paging controls and to understand where the
     * current slice of data sits within the overall catalog of rule
     * categories.
     */
    pagination: IPage.IPagination;

    /**
     * Array of community rule category summaries for the current page.
     *
     * Each element is an `ICommunityPlatformCommunityRuleCategory.ISummary`
     * DTO representing a single row from the
     * `community_platform_community_rule_categories` table, projected into
     * a lightweight view suitable for list displays and selection controls.
     * Typical consumers include search results, configuration UIs where
     * moderators choose categories for their community rules, and
     * administrative tools that review or audit the global rule category
     * catalog.
     */
    data: ICommunityPlatformCommunityRuleCategory.ISummary[];
  };
}
