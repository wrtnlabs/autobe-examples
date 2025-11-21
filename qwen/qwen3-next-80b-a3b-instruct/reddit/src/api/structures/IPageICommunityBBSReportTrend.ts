import { IPage } from "./IPage";
import { ICommunityBBSReportTrend } from "./ICommunityBBSReportTrend";

export namespace IPageICommunityBBSReportTrend {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBBSReportTrend.ISummary[];
  };
}
