import { IDiscussionBoardSection } from "./IDiscussionBoardSection";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "./IPageIDiscussionBoardAdministratorPromotionRequest";

export namespace IPageIDiscussionBoardSection {
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
     * @x-autobe-specification List of records of type IDiscussionBoardSection.ISummary.
     */
    data: IDiscussionBoardSection.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IPagination = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IDiscussionBoardSection.IPagination.
     */
    data: IDiscussionBoardSection.IPagination[];
  };
}
