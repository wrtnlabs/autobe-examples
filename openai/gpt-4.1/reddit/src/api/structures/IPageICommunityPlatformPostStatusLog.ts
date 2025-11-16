import { IPage } from "./IPage";
import { ICommunityPlatformPostStatusLog } from "./ICommunityPlatformPostStatusLog";

export namespace IPageICommunityPlatformPostStatusLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPostStatusLog.ISummary[];
  };
}
