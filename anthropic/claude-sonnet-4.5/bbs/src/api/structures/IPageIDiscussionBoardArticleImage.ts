import { IPage } from "./IPage";
import { IDiscussionBoardArticleImage } from "./IDiscussionBoardArticleImage";

export namespace IPageIDiscussionBoardArticleImage {
  /**
   * Paginated collection of article image attachment summaries.
   *
   * This response type wraps image attachment summary data from the
   * discussion_board_article_images Prisma table with pagination metadata,
   * enabling efficient retrieval and display of article images in paginated
   * views. Each page contains a subset of images matching the request
   * criteria along with navigation information for browsing through the
   * complete image attachment set.
   *
   * Used when retrieving images for a specific article in scenarios such as:
   *
   * - Rendering article image galleries with thumbnail grids
   * - Implementing lazy-loading or page-based image navigation
   * - Content management interfaces for reviewing and managing article
   *   attachments
   * - Image search results filtered by dimensions, file size, or content type
   *
   * The pagination metadata enables clients to construct navigation controls
   * for browsing large image collections and display attachment counts ("10
   * images attached"). The data array contains lightweight image summaries
   * with essential file metadata including URLs, dimensions, file sizes, and
   * content types optimized for gallery displays.
   *
   * Images are compositional attachments of articles, providing visual
   * supporting content like charts, graphs, and illustrative materials. The
   * system enforces a maximum of 10 images per article with individual 10 MB
   * file size limits. Pagination supports efficient handling of articles with
   * multiple image attachments while maintaining responsive performance.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleImage.ISummary[];
  };
}
