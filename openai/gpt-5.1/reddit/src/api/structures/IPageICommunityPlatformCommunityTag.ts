import { IPage } from "./IPage";
import { ICommunityPlatformCommunityTag } from "./ICommunityPlatformCommunityTag";

export namespace IPageICommunityPlatformCommunityTag {
  /**
   * Paginated response wrapper for community tag summaries within a single
   * community.
   *
   * This DTO is used as the response body type for operations such as
   * `/communityPlatform/communities/{communityIdentifier}/tags`, where the
   * backend returns a page of tag summaries associated with the specified
   * community. It combines generic pagination metadata with a list of
   * `ICommunityPlatformCommunityTag.ISummary` records so that client
   * applications can efficiently navigate large tag sets, implement infinite
   * scroll or next/previous pagination, and provide consistent user
   * experience across tag discovery and management screens.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of community tag results.
     *
     * This object follows the generic `IPage.IPagination` structure and
     * exposes values such as the current page index, page size limit, total
     * number of tag records that matched the filter criteria, and the total
     * page count. Clients use this information to render paging controls,
     * determine whether additional pages are available, and construct
     * follow‑up requests when users navigate through the tag list.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of community tag summary records for the current
     * page.
     *
     * Each element is an `ICommunityPlatformCommunityTag.ISummary` DTO that
     * represents a single tag belonging to the resolved community,
     * conceptually backed by a row in the
     * `community_platform_community_tags` table. The items reflect any
     * filters, search terms, and sort options supplied through
     * `ICommunityPlatformCommunityTag.IRequest`, and are typically rendered
     * as tag pills, filter chips, or selectable options in tag management
     * and post creation UIs.
     */
    data: ICommunityPlatformCommunityTag.ISummary[];
  };
}
