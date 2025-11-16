import { IPage } from "./IPage";
import { ICommunityPlatformVotingAuditLog } from "./ICommunityPlatformVotingAuditLog";

export namespace IPageICommunityPlatformVotingAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformVotingAuditLog.ISummary[];
  };
}
