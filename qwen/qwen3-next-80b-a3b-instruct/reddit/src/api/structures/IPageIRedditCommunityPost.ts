import { IPage } from "./IPage";
import { IRedditCommunityPost } from "./IRedditCommunityPost";

export namespace IPageIRedditCommunityPost {
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
     * @x-autobe-specification List of records of type IRedditCommunityPost.ISummary.
     */
    data: IRedditCommunityPost.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IS = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IRedditCommunityPost.IS.
     */
    data: IRedditCommunityPost.IS[];
  };
}
