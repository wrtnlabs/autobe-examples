import { IPage } from "./IPage";
import { ICommunityPlatformEscalationLog } from "./ICommunityPlatformEscalationLog";

export namespace IPageICommunityPlatformEscalationLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformEscalationLog.ISummary[];
  };
}
