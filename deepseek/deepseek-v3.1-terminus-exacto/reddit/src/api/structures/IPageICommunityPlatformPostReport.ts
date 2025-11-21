import { IPage } from "./IPage";
import { ICommunityPlatformPostReport } from "./ICommunityPlatformPostReport";

export namespace IPageICommunityPlatformPostReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPostReport.ISummary[];
  };
}
