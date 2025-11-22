import { IPage } from "./IPage";
import { IRedditPlatformContentAnalytics } from "./IRedditPlatformContentAnalytics";

export namespace IPageIRedditPlatformContentAnalytics {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformContentAnalytics.ISummary[];
  };
}
