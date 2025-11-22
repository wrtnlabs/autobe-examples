import { IPage } from "./IPage";
import { IRedditPlatformContentReports } from "./IRedditPlatformContentReports";

export namespace IPageIRedditPlatformContentReports {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformContentReports.ISummary[];
  };
}
