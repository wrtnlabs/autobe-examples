import { IHrmTimeTrackingEmployee } from "./IHrmTimeTrackingEmployee";
import { IPage } from "./IPage";

export namespace IPageIHrmTimeTrackingEmployee {
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
         *   IHrmTimeTrackingEmployee.ISummary.
     */
    data: IHrmTimeTrackingEmployee.ISummary[];
  };
}
