import { IPage } from "./IPage";
import { ICommunityPlatformReportDispute } from "./ICommunityPlatformReportDispute";

export namespace IPageICommunityPlatformReportDispute {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformReportDispute.ISummary[];
  };
}
