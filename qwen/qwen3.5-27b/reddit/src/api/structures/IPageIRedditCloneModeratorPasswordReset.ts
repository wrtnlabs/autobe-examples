import { IPage } from "./IPage";
import { IRedditCloneModeratorPasswordReset } from "./IRedditCloneModeratorPasswordReset";

export namespace IPageIRedditCloneModeratorPasswordReset {
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
         *   IRedditCloneModeratorPasswordReset.ISummary.
     */
    data: IRedditCloneModeratorPasswordReset.ISummary[];
  };
}
