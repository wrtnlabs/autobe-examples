import { IDiscussionBoardErrorLog } from "./IDiscussionBoardErrorLog";
import { IPage } from "./IPage";

export namespace IPageIDiscussionBoardErrorLog {
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
     * @x-autobe-specification List of records of type IDiscussionBoardErrorLog.ISummary.
     */
    data: IDiscussionBoardErrorLog.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IAnalyticsSummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IDiscussionBoardErrorLog.IAnalyticsSummary.
     */
    data: IDiscussionBoardErrorLog.IAnalyticsSummary[];
  };
}
