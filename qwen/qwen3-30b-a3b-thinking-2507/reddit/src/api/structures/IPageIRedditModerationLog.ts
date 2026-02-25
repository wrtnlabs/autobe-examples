import { IPage } from "./IPage";
import { IRedditModerationLog } from "./IRedditModerationLog";

export namespace IPageIRedditModerationLog {
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
     * @x-autobe-specification List of records of type IRedditModerationLog.ISummary.
     */
    data: IRedditModerationLog.ISummary[];
  };
}
