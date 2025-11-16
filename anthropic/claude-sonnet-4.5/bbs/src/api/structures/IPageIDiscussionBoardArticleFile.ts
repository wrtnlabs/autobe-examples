import { IPage } from "./IPage";
import { IDiscussionBoardArticleFile } from "./IDiscussionBoardArticleFile";

export namespace IPageIDiscussionBoardArticleFile {
  /**
   * Paginated response containing a collection of article file attachment
   * summaries.
   *
   * This DTO represents a single page of file attachment records along with
   * comprehensive pagination metadata. It follows the standard pagination
   * pattern used throughout the API for consistent handling of large datasets
   * that need to be retrieved in manageable chunks.
   *
   * The response structure separates the actual data payload (file summaries)
   * from the pagination control information, enabling clients to efficiently
   * navigate through large collections of file attachments while
   * understanding their position within the complete dataset.
   *
   * Typically used as the response body for file listing and search
   * operations, providing both the requested file data and the context needed
   * to implement pagination UI controls such as page numbers, next/previous
   * buttons, and result counts.
   */
  export type ISummary = {
    /**
     * Pagination metadata providing information about the current page,
     * total records, and navigation context.
     *
     * This object contains essential pagination information including the
     * current page number, the limit of records per page, total number of
     * records in the complete dataset, and the total number of pages
     * available. Clients use this information to implement pagination
     * controls and navigate through the complete file collection.
     */
    pagination: IPage.IPagination;

    /**
     * Array of file attachment summary records for the current page.
     *
     * Contains the actual file data matching the query criteria, limited to
     * the specified page size. Each element provides essential file
     * information including identifier, name, extension, URL, and size. The
     * array may be empty if no files match the filter criteria or if the
     * requested page is beyond the available data range.
     */
    data: IDiscussionBoardArticleFile.ISummary[];
  };
}
