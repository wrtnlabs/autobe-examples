import { IPage } from "./IPage";
import { IRedditCommunityGuestSession } from "./IRedditCommunityGuestSession";

export namespace IPageIRedditCommunityGuestSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityGuestSession.ISummary[];
  };
}
