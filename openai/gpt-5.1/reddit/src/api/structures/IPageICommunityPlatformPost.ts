import { IPage } from "./IPage";
import { ICommunityPlatformPost } from "./ICommunityPlatformPost";

export namespace IPageICommunityPlatformPost {
  /**
   * Paginated collection of community platform post summaries.
   *
   * This schema wraps a page of `ICommunityPlatformPost.ISummary` entries,
   * representing posts stored in `community_platform_posts` together with
   * minimal community, author, and post type context, along with pagination
   * metadata from `IPage.IPagination`. It is the standard response envelope
   * for list and feed operations such as `PATCH /communityPlatform/posts`,
   * the home feed, and community-specific feed endpoints.
   *
   * Clients should use this type to drive feed-style UIs, combining the
   * `pagination` information to manage paging or infinite scroll behavior and
   * the `data` array to render individual post cards or list rows for the
   * current page of results.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this page of post summaries.
     *
     * The `IPage.IPagination` structure reports the current page index, the
     * per-page limit, the total number of matching posts across all pages,
     * and the total number of pages that result from the active filters and
     * sorting mode. It is always present so that clients implementing
     * feeds, search results, or infinite scroll UIs can correctly manage
     * navigation and detect when the end of the result set has been
     * reached.
     */
    pagination: IPage.IPagination;

    /**
     * Slice of post summary DTOs for the requested page.
     *
     * Each element is an `ICommunityPlatformPost.ISummary` record derived
     * from the `community_platform_posts` table and related entities such
     * as communities, authors, and post types. These summaries contain the
     * fields required to render list and feed views (for example,
     * identifiers, community and author context, title, key content
     * preview, and timestamps) without loading full post bodies or
     * historical snapshots.
     *
     * The array may be empty if no posts satisfy the query filters or if
     * the caller requests a page index beyond the available range. In such
     * cases, `pagination.records` and `pagination.pages` in the
     * `pagination` object provide the authoritative total counts so that
     * clients can detect that no more posts are available.
     */
    data: ICommunityPlatformPost.ISummary[];
  };
}
