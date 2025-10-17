import { IPage } from "./IPage";
import { ICommunityPortalReport } from "./ICommunityPortalReport";

export namespace IPageICommunityPortalReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPortalReport.ISummary[];
  };
}
