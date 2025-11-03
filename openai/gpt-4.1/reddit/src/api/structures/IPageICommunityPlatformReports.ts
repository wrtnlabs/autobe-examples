import { IPage } from "./IPage";
import { ICommunityPlatformReports } from "./ICommunityPlatformReports";

export namespace IPageICommunityPlatformReports {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformReports.ISummary[];
  };
}
