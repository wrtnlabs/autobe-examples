import { IDiscussionBoardAdministratorDistributionStatistic } from "./IDiscussionBoardAdministratorDistributionStatistic";
import { IPage } from "./IPage";

export namespace IPageIDiscussionBoardAdministratorDistributionStatistic {
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
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IDiscussionBoardAdministratorDistributionStatistic.IPagination.
     */
    data: IDiscussionBoardAdministratorDistributionStatistic.IPagination[];
  };
}
