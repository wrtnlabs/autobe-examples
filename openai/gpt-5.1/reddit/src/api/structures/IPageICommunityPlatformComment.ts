import { IPage } from "./IPage";
import { ICommunityPlatformComment } from "./ICommunityPlatformComment";

export namespace IPageICommunityPlatformComment {
  /**
   * Paginated container of comment summaries for a specific post.
   *
   * This schema is used as the response body for comment listing operations
   * such as `PATCH /communityPlatform/posts/{postId}/comments`. It wraps a
   * page of `ICommunityPlatformComment.ISummary` entries associated with the
   * given post together with standard pagination metadata from
   * `IPage.IPagination`, enabling clients to efficiently page through,
   * search, and sort comment threads under a single post.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of comments returned
     * for a given post.
     *
     * This structure follows the shared `IPage.IPagination` schema and
     * provides the current page index, page size, total record count, and
     * derived page count. It is used by clients of
     * `/communityPlatform/posts/{postId}/comments` to drive comment list
     * pagination or infinite scroll under a single post.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of comment summary DTOs for the current page of results.
     *
     * Each element is an `ICommunityPlatformComment.ISummary` representing
     * a single comment or reply row from `community_platform_comments` that
     * belongs to the post identified by `postId` in the route. This array
     * contains only the comments that match the filters, sort order, and
     * pagination criteria supplied via
     * `ICommunityPlatformComment.IRequest`, making it suitable for
     * rendering comment lists and thread views without additional
     * per-comment lookups.
     */
    data: ICommunityPlatformComment.ISummary[];
  };
}
