import { IPage } from "./IPage";
import { IRedditCommunityModeratorSession } from "./IRedditCommunityModeratorSession";

export namespace IPageIRedditCommunityModeratorSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityModeratorSession.ISummary[];
  };
}
