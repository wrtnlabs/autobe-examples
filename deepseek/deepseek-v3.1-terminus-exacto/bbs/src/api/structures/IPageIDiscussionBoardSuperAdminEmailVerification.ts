import { IDiscussionBoardSuperAdminEmailVerification } from "./IDiscussionBoardSuperAdminEmailVerification";
import { IPageIDiscussionBoardSection } from "./IPageIDiscussionBoardSection";

export namespace IPageIDiscussionBoardSuperAdminEmailVerification {
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
    pagination: IPageIDiscussionBoardSection.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IDiscussionBoardSuperAdminEmailVerification.ISummary.
     */
    data: IDiscussionBoardSuperAdminEmailVerification.ISummary[];
  };
}
