import { IPage } from "./IPage";
import { ICommunityPlatformDefaultFeed } from "./ICommunityPlatformDefaultFeed";

export namespace IPageICommunityPlatformDefaultFeed {
  /**
   * Paginated collection of default feed configuration summaries backed by
   * community_platform_default_feeds.
   *
   * This page wrapper is returned by search-style endpoints such as PATCH
   * /communityPlatform/platformAdmin/defaultFeeds. It combines pagination
   * metadata (via IPage.IPagination) with an array of
   * ICommunityPlatformDefaultFeed.ISummary records so that administrative
   * consoles can both render the current slice of default feed configurations
   * and drive UI paging controls based on total counts and page information.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of default feed
     * configuration records.
     *
     * This object follows the shared IPage.IPagination contract and exposes
     * values such as the current page index, the maximum number of records
     * per page, the total number of matching records, and the computed
     * total number of pages. Administrative UIs use this information to
     * render paging controls (for example, next/previous buttons, page
     * counts) when browsing default feed configurations.
     */
    pagination: IPage.IPagination;

    /**
     * List of default feed configuration summaries for the current page.
     *
     * Each element is an ICommunityPlatformDefaultFeed.ISummary DTO
     * representing a single row from the community_platform_default_feeds
     * Prisma model. The records in this array correspond to the subset of
     * configurations that match the applied search filters and fall within
     * the requested page window, making this collection suitable for table
     * views and listing screens in platform admin tools.
     */
    data: ICommunityPlatformDefaultFeed.ISummary[];
  };
}
