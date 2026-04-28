import { IPage } from "./IPage";
import { IREdditLikeCommunityCommunityBan } from "./IREdditLikeCommunityCommunityBan";

export namespace IPageIRedditLikeCommunityCommunityBan {
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
         *   IRedditLikeCommunityCommunityBan.ISummary.
     */
    data: IREdditLikeCommunityCommunityBan.ISummary[];
  };
}
