import { IPage } from "./IPage";
import { IRedditCloneMemberPasswordReset } from "./IRedditCloneMemberPasswordReset";

export namespace IPageIRedditCloneMemberPasswordReset {
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
         *   IRedditCloneMemberPasswordReset.ISummary.
     */
    data: IRedditCloneMemberPasswordReset.ISummary[];
  };
}
