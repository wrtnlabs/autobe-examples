import { IPage } from "./IPage";
import { IWeeklySummaryReport } from "./IWeeklySummaryReport";

export namespace IPageIWeeklySummaryReport {
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
         *   IWeeklySummaryReport.ISummary.
     */
    data: IWeeklySummaryReport.ISummary[];
  };
}
