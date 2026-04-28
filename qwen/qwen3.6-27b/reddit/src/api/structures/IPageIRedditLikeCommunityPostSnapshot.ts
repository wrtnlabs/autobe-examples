import { IPage } from "./IPage";
import { IRedditLikeCommunityPostSnapshot } from "./IRedditLikeCommunityPostSnapshot";

export namespace IPageIRedditLikeCommunityPostSnapshot {
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
         *   IRedditLikeCommunityPostSnapshot.ISummary.
     */
    data: IRedditLikeCommunityPostSnapshot.ISummary[];
  };
}
