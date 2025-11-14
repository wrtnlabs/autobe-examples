import { IPage } from "./IPage";
import { IPoliticalForumComment } from "./IPoliticalForumComment";

export namespace IPageIPoliticalForumComment {
  /**
   * A paginated collection of political forum comments for display in list
   * views.
   *
   * This response format is used by the
   * /politicalForum/posts/{postId}/comments endpoint to efficiently deliver
   * comment data to clients. The schema follows the API's standard pagination
   * pattern with two key components: pagination metadata and a data array of
   * comment summaries.
   *
   * The pagination object provides essential navigation information for
   * clients to implement infinite scrolling or traditional pagination
   * controls. The data array contains only the information necessary for
   * display purposes (not full comment details), reducing response size and
   * improving performance.
   *
   * Comments are filtered, sorted, and paginated according to the parameters
   * in the request body (IPoliticalForumComment.IRequest). Only active and
   * visible comments are included in the result set based on user permissions
   * and moderation status.
   *
   * Critical for both citizen-facing interfaces showing nested comments under
   * posts and moderator dashboards that need to review large volumes of
   * comments efficiently.
   */
  export type ISummary = {
    /**
     * Pagination metadata containing page number, page size, and total
     * records count. This structure is consistent across all paginated
     * responses in the API and follows the industry-standard pagination
     * pattern.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of comment summary objects that match the search criteria.
     * Each item contains the minimal information needed to display a
     * comment in a list view, including its ID, content, creation
     * timestamp, and associated post and citizen IDs.
     */
    data: IPoliticalForumComment.ISummary[];
  };
}
