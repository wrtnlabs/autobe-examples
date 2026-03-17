import { IPage } from "./IPage";
import { IRedditCommunityCommentDeletion } from "./IRedditCommunityCommentDeletion";

export namespace IPageIRedditCommunityCommentDeletion {
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
     * @x-autobe-specification List of records of type IRedditCommunityCommentDeletion.ISummary.
     */
    data: IRedditCommunityCommentDeletion.ISummary[];
  };
}
