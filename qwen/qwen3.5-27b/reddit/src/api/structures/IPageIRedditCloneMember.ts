import { IPage } from "./IPage";
import { IRedditCloneMember } from "./IRedditCloneMember";

export namespace IPageIRedditCloneMember {
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
         *   IRedditCloneMember.ISummary.
     */
    data: IRedditCloneMember.ISummary[];
  };
}
