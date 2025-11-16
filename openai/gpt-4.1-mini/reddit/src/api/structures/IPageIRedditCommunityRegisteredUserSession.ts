import { IPage } from "./IPage";
import { IRedditCommunityRegisteredUserSession } from "./IRedditCommunityRegisteredUserSession";

export namespace IPageIRedditCommunityRegisteredUserSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityRegisteredUserSession.ISummary[];
  };
}
