import { IPage } from "./IPage";
import { ICommunityPlatformPostType } from "./ICommunityPlatformPostType";

export namespace IPageICommunityPlatformPostType {
  /**
   * Paginated collection of community post type summary records.
   *
   * This schema wraps a page of `ICommunityPlatformPostType.ISummary` entries
   * produced from the `community_platform_post_types` lookup table together
   * with pagination information from `IPage.IPagination`. It is used by
   * administrative and configuration endpoints such as `PATCH
   * /communityPlatform/platformAdmin/postTypes` to return search and list
   * results for post type definitions.
   *
   * Clients can rely on the `pagination` object to understand how many total
   * post type records exist and how many pages are available, while the
   * `data` array provides the current slice of post type summaries to render
   * in tables, dropdowns, or configuration screens.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this page of post type results.
     *
     * This object follows the `IPage.IPagination` schema, exposing fields
     * such as the current page index, the per-page limit, the total number
     * of records across all pages, and the total number of pages that can
     * be navigated. It is always present, even when the `data` array is
     * empty, so that clients can reliably drive list navigation and disable
     * further paging when the end of the result set has been reached.
     */
    pagination: IPage.IPagination;

    /**
     * Slice of post type summary records for the requested page.
     *
     * Each element is an `ICommunityPlatformPostType.ISummary` DTO derived
     * from a row in the `community_platform_post_types` table, containing
     * identification and display fields such as `id`, `code`, `name`, and
     * descriptive text.
     *
     * The array may be empty when no post types match the supplied search
     * criteria, or when the client requests a page index that lies beyond
     * the last page. In all cases, callers should consult the `pagination`
     * object—particularly `records` and `pages`—to understand the total
     * number of available post type definitions and to implement correct
     * paging behavior in administrative UIs.
     */
    data: ICommunityPlatformPostType.ISummary[];
  };
}
