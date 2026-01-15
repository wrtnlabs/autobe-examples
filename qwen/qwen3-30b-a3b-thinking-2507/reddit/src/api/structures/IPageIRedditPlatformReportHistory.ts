import { IPage } from "./IPage";
import { IRedditPlatformReportHistory } from "./IRedditPlatformReportHistory";

export namespace IPageIRedditPlatformReportHistory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformReportHistory.ISummary[];
  };
}
