import { IPage } from "./IPage";
import { ICommunityPlatformModerationCaseReport } from "./ICommunityPlatformModerationCaseReport";

export namespace IPageICommunityPlatformModerationCaseReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModerationCaseReport.ISummary[];
  };
}
