import { IPage } from "./IPage";
import { ICommunityPlatformReportOfGuest } from "./ICommunityPlatformReportOfGuest";

export namespace IPageICommunityPlatformReportOfGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformReportOfGuest.ISummary[];
  };
}
