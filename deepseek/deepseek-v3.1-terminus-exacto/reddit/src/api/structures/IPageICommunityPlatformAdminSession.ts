import { IPage } from "./IPage";
import { ICommunityPlatformAdminSession } from "./ICommunityPlatformAdminSession";

export namespace IPageICommunityPlatformAdminSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAdminSession.ISummary[];
  };
}
