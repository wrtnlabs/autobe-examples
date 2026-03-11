import { IDiscussionBoardSystemHealthMetric } from "./IDiscussionBoardSystemHealthMetric";
import { IPage } from "./IPage";

export namespace IPageIDiscussionBoardSystemHealthMetric {
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
     * @x-autobe-specification List of records of type IDiscussionBoardSystemHealthMetric.ISummary.
     */
    data: IDiscussionBoardSystemHealthMetric.ISummary[];
  };
}
