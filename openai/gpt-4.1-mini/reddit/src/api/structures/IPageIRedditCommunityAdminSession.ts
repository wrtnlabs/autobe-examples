import { IPage } from "./IPage";
import { IRedditCommunityAdminSession } from "./IRedditCommunityAdminSession";

export namespace IPageIRedditCommunityAdminSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityAdminSession.ISummary[];
  };
}
