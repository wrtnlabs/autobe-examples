import { IPage } from "./IPage";
import { IRedditLikeCommunitySubscription } from "./IRedditLikeCommunitySubscription";

export namespace IPageIRedditLikeCommunitySubscription {
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
         *   IRedditLikeCommunitySubscription.ISummary.
     */
    data: IRedditLikeCommunitySubscription.ISummary[];
  };
}
