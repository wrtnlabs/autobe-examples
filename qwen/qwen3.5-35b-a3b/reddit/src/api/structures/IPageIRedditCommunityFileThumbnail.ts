import { IPage } from "./IPage";
import { IRedditCommunityFileThumbnail } from "./IRedditCommunityFileThumbnail";

export namespace IPageIRedditCommunityFileThumbnail {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IRedditCommunityFileThumbnail.ISummary.
     */
    data: IRedditCommunityFileThumbnail.ISummary[];
  };
}
