import { IPage } from "./IPage";
import { IRedditPlatformUserActivityLog } from "./IRedditPlatformUserActivityLog";

export namespace IPageIRedditPlatformUserActivityLog {
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
     * @x-autobe-specification List of records of type IRedditPlatformUserActivityLog.ISummary.
     */
    data: IRedditPlatformUserActivityLog.ISummary[];
  };
}
