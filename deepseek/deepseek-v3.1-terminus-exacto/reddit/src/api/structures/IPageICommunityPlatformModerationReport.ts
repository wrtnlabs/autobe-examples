import { IPage } from "./IPage";
import { ICommunityPlatformModerationReport } from "./ICommunityPlatformModerationReport";

export namespace IPageICommunityPlatformModerationReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModerationReport.ISummary[];
  };
}
