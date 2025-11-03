import { IPage } from "./IPage";
import { IRedditCommunityUserSession } from "./IRedditCommunityUserSession";

export namespace IPageIRedditCommunityUserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityUserSession.ISummary[];
  };
}
