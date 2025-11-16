import { IPage } from "./IPage";
import { IDiscussionBoardArticleAttachment } from "./IDiscussionBoardArticleAttachment";

export namespace IPageIDiscussionBoardArticleAttachment {
  /**
   * Paginated set of summary records for discussion board article
   * attachments.
   *
   * The `data` field lists metadata for attachments
   * (IDiscussionBoardArticleAttachment.ISummary variant) returned in a
   * file/evidence search, resource browser, or moderation audit for a
   * specific article. This wrapper ensures all pagination, search/filter, and
   * business logic requirements for attachments sets are clearly represented
   * for API clients.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this attachments listing. Contains current
     * page, total attachment records, per-page limit, and number of result
     * pages for the attachments set.
     */
    pagination: IPage.IPagination;

    /**
     * Array of attachment summary DTOs
     * (IDiscussionBoardArticleAttachment.ISummary) for the current page.
     * Each entry describes a file/image resource, such as URI, filename,
     * MIME type, and referencing article.
     */
    data: IDiscussionBoardArticleAttachment.ISummary[];
  };
}
