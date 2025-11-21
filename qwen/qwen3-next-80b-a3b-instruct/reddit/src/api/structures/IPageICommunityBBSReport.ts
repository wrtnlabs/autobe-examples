import { IPage } from "./IPage";
import { ICommunityBBSReport } from "./ICommunityBBSReport";

export namespace IPageICommunityBBSReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBBSReport.ISummary[];
  };
}
