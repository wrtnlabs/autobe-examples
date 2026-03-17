import { IPage } from "./IPage";
import { IRedditCommunityCommentSnapshot } from "./IRedditCommunityCommentSnapshot";

export namespace IPageIRedditCommunityCommentSnapshot {
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
     * @x-autobe-specification List of records of type IRedditCommunityCommentSnapshot.ISummary.
     */
    data: IRedditCommunityCommentSnapshot.ISummary[];
  };
}
