import { IPage } from "./IPage";
import { ICommunityPlatformUserSession } from "./ICommunityPlatformUserSession";

export namespace IPageICommunityPlatformUserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUserSession.ISummary[];
  };
}
