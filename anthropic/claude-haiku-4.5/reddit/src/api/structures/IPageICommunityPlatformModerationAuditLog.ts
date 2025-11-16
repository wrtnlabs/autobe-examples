import { IPage } from "./IPage";
import { ICommunityPlatformModerationAuditLog } from "./ICommunityPlatformModerationAuditLog";

export namespace IPageICommunityPlatformModerationAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModerationAuditLog.ISummary[];
  };
}
