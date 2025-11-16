import { IPage } from "./IPage";
import { ICommunityPlatformUserReport } from "./ICommunityPlatformUserReport";

export namespace IPageICommunityPlatformUserReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUserReport.ISummary[];
  };
}
