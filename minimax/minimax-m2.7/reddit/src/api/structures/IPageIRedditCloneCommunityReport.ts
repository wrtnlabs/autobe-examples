import { IPage } from "./IPage";
import { IRedditCloneCommunityReport } from "./IRedditCloneCommunityReport";

export namespace IPageIRedditCloneCommunityReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IIndex = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IRedditCloneCommunityReport.IIndex.
     */
    data: IRedditCloneCommunityReport.IIndex[];
  };
}
