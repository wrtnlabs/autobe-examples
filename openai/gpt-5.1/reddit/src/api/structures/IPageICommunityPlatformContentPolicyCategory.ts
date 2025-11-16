import { IPage } from "./IPage";
import { ICommunityPlatformContentPolicyCategory } from "./ICommunityPlatformContentPolicyCategory";

export namespace IPageICommunityPlatformContentPolicyCategory {
  /**
   * Paginated response wrapper for content policy category summaries.
   *
   * This schema represents the standard page envelope returned by the PATCH
   * `/communityPlatform/platformAdmin/contentPolicyCategories` operation when
   * listing rows from the `community_platform_content_policy_categories`
   * table. It combines pagination metadata with a list of
   * `ICommunityPlatformContentPolicyCategory.ISummary` items so that
   * administrative and policy tools can browse, filter, and sort the global
   * taxonomy of content policy categories.
   *
   * Clients should use the `pagination` object to manage page navigation and
   * the `data` array to render the current slice of category records in
   * tables, grids, or selection components.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of content policy
     * categories.
     *
     * This property follows the `IPage.IPagination` schema and exposes the
     * current page index, the maximum number of records per page, the total
     * number of matching records in
     * `community_platform_content_policy_categories`, and the total number
     * of pages that can be navigated.
     *
     * Administrative consoles and policy-authoring tools use this
     * information to render paging controls, compute whether additional
     * pages are available, and drive subsequent paginated requests when
     * browsing the global taxonomy of content policy categories.
     */
    pagination: IPage.IPagination;

    /**
     * Array of content policy category summaries that belong to the current
     * page.
     *
     * Each element is an `ICommunityPlatformContentPolicyCategory.ISummary`
     * DTO, representing a single row from the
     * `community_platform_content_policy_categories` Prisma model in a
     * lightweight form suitable for list displays and selection widgets.
     *
     * Typical consumers include the PATCH
     * `/communityPlatform/platformAdmin/contentPolicyCategories` search
     * endpoint, where this collection supplies the visible category rows
     * for the current page of results based on the applied filters and sort
     * order.
     */
    data: ICommunityPlatformContentPolicyCategory.ISummary[];
  };
}
