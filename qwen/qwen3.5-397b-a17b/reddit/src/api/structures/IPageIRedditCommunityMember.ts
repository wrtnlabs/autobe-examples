import { IPage } from "./IPage";
import { IRedditCommunityMember } from "./IRedditCommunityMember";

export namespace IPageIRedditCommunityMember {
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
     * @x-autobe-specification List of records of type IRedditCommunityMember.ISummary.
     */
    data: IRedditCommunityMember.ISummary[];
  };
}
