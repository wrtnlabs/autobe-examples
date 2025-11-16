import { IPage } from "./IPage";
import { ICommunityPlatformAdminuserSession } from "./ICommunityPlatformAdminuserSession";

export namespace IPageICommunityPlatformAdminuserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAdminuserSession.ISummary[];
  };
}
