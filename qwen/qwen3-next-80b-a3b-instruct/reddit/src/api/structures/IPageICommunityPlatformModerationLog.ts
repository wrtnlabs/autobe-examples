import { IPage } from "./IPage";
import { ICommunityPlatformModerationLog } from "./ICommunityPlatformModerationLog";

export namespace IPageICommunityPlatformModerationLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModerationLog.ISummary[];
  };
}
