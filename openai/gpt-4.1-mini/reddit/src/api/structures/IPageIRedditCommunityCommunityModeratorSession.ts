import { IPage } from "./IPage";
import { IRedditCommunityCommunityModeratorSession } from "./IRedditCommunityCommunityModeratorSession";

export namespace IPageIRedditCommunityCommunityModeratorSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityCommunityModeratorSession.ISummary[];
  };
}
