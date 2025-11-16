import { IPage } from "./IPage";
import { ICommunityPlatformAuditLog } from "./ICommunityPlatformAuditLog";

export namespace IPageICommunityPlatformAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAuditLog.ISummary[];
  };
}
