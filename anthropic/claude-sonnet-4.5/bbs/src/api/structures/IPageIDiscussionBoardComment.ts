import { IPage } from "./IPage";
import { IDiscussionBoardComment } from "./IDiscussionBoardComment";

export namespace IPageIDiscussionBoardComment {
  /**
   * Paginated collection of discussion board comment summaries.
   *
   * This response type wraps comment summary data from the
   * discussion_board_comments Prisma table with pagination metadata, enabling
   * efficient retrieval and display of article comments in paginated views.
   * Each page contains a subset of comments matching the request criteria
   * along with navigation information for browsing through the complete
   * comment set.
   *
   * Used when retrieving comments for a specific article in scenarios such
   * as:
   *
   * - Rendering article discussion threads with chronological comment display
   * - Implementing infinite scroll or page-based comment navigation
   * - Moderation interfaces reviewing comments across articles
   * - User activity feeds showing comment history
   *
   * The pagination metadata enables clients to construct navigation controls
   * (previous/next page, page numbers) and display result counts ("Showing 10
   * of 247 comments"). The data array contains lightweight comment summaries
   * optimized for list views, including comment content, author information,
   * and timestamps.
   *
   * Comments are compositional elements of articles, representing community
   * engagement and discussion. Pagination is essential for articles with
   * large comment volumes, preventing performance issues and enabling
   * responsive user interfaces.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardComment.ISummary[];
  };
}
