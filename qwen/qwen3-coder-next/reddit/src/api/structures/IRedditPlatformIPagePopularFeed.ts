import { IPage } from "./IPage";
import { IRedditPlatformPost } from "./IRedditPlatformPost";

export namespace IRedditPlatformIPagePopularFeed {
  /**
   * Paginated popular feed response containing posts with pagination metadata.
   */
  export type ISummary = {
    /**
     * Pagination metadata containing current page position and total data statistics.
     *
     * @x-autobe-specification IPage.IPagination object containing current page number, limit, total records, and total pages. Standard pagination metadata for all paginated responses.
     */
    pagination: IPage.IPagination;

    /**
     * List of popular feed posts with summary information for each post.
     *
     * @x-autobe-specification Array of IRedditPlatformPost.ISummary objects representing posts in the popular feed. Each post includes essential information for content discovery while excluding large content fields and composition arrays to optimize performance.
     */
    data: IRedditPlatformPost.ISummary[];
  };
}
