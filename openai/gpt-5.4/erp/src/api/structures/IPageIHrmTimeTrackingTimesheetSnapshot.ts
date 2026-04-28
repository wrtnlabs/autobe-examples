import { IHrmTimeTrackingTimesheetSnapshot } from "./IHrmTimeTrackingTimesheetSnapshot";
import { IPage } from "./IPage";

export namespace IPageIHrmTimeTrackingTimesheetSnapshot {
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
         *   IHrmTimeTrackingTimesheetSnapshot.ISummary.
     */
    data: IHrmTimeTrackingTimesheetSnapshot.ISummary[];
  };
}
