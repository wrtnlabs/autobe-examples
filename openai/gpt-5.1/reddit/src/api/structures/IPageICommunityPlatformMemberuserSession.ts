import { IPage } from "./IPage";
import { ICommunityPlatformMemberuserSession } from "./ICommunityPlatformMemberuserSession";

export namespace IPageICommunityPlatformMemberuserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMemberuserSession.ISummary[];
  };
}
