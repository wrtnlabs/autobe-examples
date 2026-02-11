import { IPage } from "./IPage";
import { IRedditCommunityBanOfMember } from "./IRedditCommunityBanOfMember";

export namespace IPageIRedditCommunityBanOfMember {
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
     * @x-autobe-specification List of records of type IRedditCommunityBanOfMember.ISummary.
     */
    data: IRedditCommunityBanOfMember.ISummary[];
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
     * @x-autobe-specification List of records of type IRedditCommunityBanOfMember.IS.
     */
    data: IRedditCommunityBanOfMember.IS[];
  };
}
