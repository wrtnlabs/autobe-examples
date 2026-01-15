import { IPage } from "./IPage";
import { IRedditPlatformReport } from "./IRedditPlatformReport";

export namespace IPageIRedditPlatformReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformReport.ISummary[];
  };
}
