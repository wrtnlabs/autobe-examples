import { IPage } from "./IPage";
import { ICommunityBbsReport } from "./ICommunityBbsReport";

export namespace IPageICommunityBbsReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsReport.ISummary[];
  };
}
