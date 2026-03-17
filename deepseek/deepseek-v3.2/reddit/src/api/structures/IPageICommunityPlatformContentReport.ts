import { ICommunityPlatformContentReport } from "./ICommunityPlatformContentReport";
import { IPage } from "./IPage";

export namespace IPageICommunityPlatformContentReport {
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
     * @x-autobe-specification List of records of type ICommunityPlatformContentReport.ISummary.
     */
    data: ICommunityPlatformContentReport.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IDashboard = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type ICommunityPlatformContentReport.IDashboard.
     */
    data: ICommunityPlatformContentReport.IDashboard[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IGroupedSummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type ICommunityPlatformContentReport.IGroupedSummary.
     */
    data: ICommunityPlatformContentReport.IGroupedSummary[];
  };
}
