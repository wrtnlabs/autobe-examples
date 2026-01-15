import { IPage } from "./IPage";
import { ICommunityPlatformMemberSession } from "./ICommunityPlatformMemberSession";

export namespace IPageICommunityPlatformMemberSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMemberSession.ISummary[];
  };
}
