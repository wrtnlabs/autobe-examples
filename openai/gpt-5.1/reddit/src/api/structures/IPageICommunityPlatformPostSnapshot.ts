import { IPage } from "./IPage";
import { ICommunityPlatformPostSnapshot } from "./ICommunityPlatformPostSnapshot";

export namespace IPageICommunityPlatformPostSnapshot {
  /**
   * Paginated container of historical post snapshot summaries for a single
   * post.
   *
   * This schema is used as the response body for listing operations such as
   * `PATCH /communityPlatform/platformAdmin/posts/{postId}/snapshots`, where
   * it wraps a page of `ICommunityPlatformPostSnapshot.ISummary` records
   * along with standard pagination metadata. The `pagination` field exposes
   * page, limit, and total counts via `IPage.IPagination`, while `data`
   * carries the actual snapshot summaries for the requested slice of the
   * post's edit history.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of post snapshot history.
     *
     * This object follows the shared `IPage.IPagination` contract and
     * describes which page of results is being returned, how many records
     * are included per page, and how many total snapshot records exist for
     * the underlying post. Clients use this information together with
     * request parameters such as page and limit from
     * `ICommunityPlatformPostSnapshot.IRequest` to implement stable
     * navigation through the full edit history.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of post snapshot summary records for the current page.
     *
     * Each element is an `ICommunityPlatformPostSnapshot.ISummary` DTO
     * representing a single historical snapshot row from
     * `community_platform_post_snapshots` associated with the specified
     * post. In the
     * `/communityPlatform/platformAdmin/posts/{postId}/snapshots`
     * operation, this array contains only snapshots belonging to the
     * `postId` in the path, ordered and filtered according to the request
     * criteria.
     */
    data: ICommunityPlatformPostSnapshot.ISummary[];
  };
}
