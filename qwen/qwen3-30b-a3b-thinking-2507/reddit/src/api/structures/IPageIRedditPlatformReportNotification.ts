import { IPage } from "./IPage";
import { IRedditPlatformReportNotification } from "./IRedditPlatformReportNotification";

export namespace IPageIRedditPlatformReportNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformReportNotification.ISummary[];
  };
}
