import { ICommunityHubPost } from "./ICommunityHubPost";
import { IPage } from "./IPage";

export namespace IPageICommunityHubPost {
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
         * @x-autobe-specification List of records of type
         *   ICommunityHubPost.ISummary.
     */
    data: ICommunityHubPost.ISummary[];
  };
}
