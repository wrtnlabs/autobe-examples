import { IDiscussionBoardModeratedContentHistory } from "./IDiscussionBoardModeratedContentHistory";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "./IPageIDiscussionBoardAdministratorDistributionStatistic";

export namespace IPageIDiscussionBoardModeratedContentHistory {
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
    pagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IDiscussionBoardModeratedContentHistory.ISummary.
     */
    data: IDiscussionBoardModeratedContentHistory.ISummary[];
  };
}
