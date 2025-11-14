import { IPage } from "./IPage";
import { IPoliticalForumPostAttachment } from "./IPoliticalForumPostAttachment";

export namespace IPageIPoliticalForumPostAttachment {
  /**
   * A paginated collection of political forum post attachments for display in
   * list views.
   *
   * This response format is used by the
   * /politicalForum/citizen/posts/{postId}/attachmentFiles endpoint to
   * efficiently deliver attachment data to clients. The schema follows the
   * API's standard pagination pattern with two key components: pagination
   * metadata and a data array of attachment summaries.
   *
   * The pagination object provides essential navigation information for
   * clients to implement infinite scrolling or traditional pagination
   * controls. The data array contains only the information necessary for
   * display purposes (not full attachment metadata), reducing response size
   * and improving performance.
   *
   * Attachments are filtered and paginated according to the parameters in the
   * request body (IPoliticalForumPostAttachment.IRequest). Only active
   * attachments (with deleted_at null) are included in the result set based
   * on the parent post's visibility and user permissions.
   *
   * Critical for both citizen-facing interfaces showing file attachments
   * under posts and moderator dashboards that need to review file uploads
   * systematically.
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
     * Collection of attachment summary objects that match the search
     * criteria. Each item contains the minimal information needed to
     * display an attachment in a list view, including its ID, filename,
     * file path, size, and upload timestamp.
     */
    data: IPoliticalForumPostAttachment.ISummary[];
  };
}
