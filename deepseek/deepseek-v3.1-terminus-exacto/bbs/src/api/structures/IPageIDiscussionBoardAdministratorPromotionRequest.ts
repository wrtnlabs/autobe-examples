import { IDiscussionBoardAdministratorPromotionRequest } from "./IDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "./IPageIDiscussionBoardAdministratorDistributionStatistic";

export namespace IPageIDiscussionBoardAdministratorPromotionRequest {
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
    pagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IDiscussionBoardAdministratorPromotionRequest.IPagination.
     */
    data: IDiscussionBoardAdministratorPromotionRequest.IPagination[];
  };
}
