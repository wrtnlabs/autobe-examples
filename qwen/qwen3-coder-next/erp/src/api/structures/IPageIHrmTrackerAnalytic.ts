import { IHrmTrackerAnalytic } from "./IHrmTrackerAnalytic";
import { IPage } from "./IPage";

export namespace IPageIHrmTrackerAnalytic {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IEmployeeStatistic = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IHrmTrackerAnalytic.IEmployeeStatistic.
     */
    data: IHrmTrackerAnalytic.IEmployeeStatistic[];
  };
}
