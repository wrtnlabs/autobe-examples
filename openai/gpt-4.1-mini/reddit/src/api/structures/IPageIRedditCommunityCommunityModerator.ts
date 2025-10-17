import { IPage } from "./IPage";
import { IRedditCommunityCommunityModerator } from "./IRedditCommunityCommunityModerator";

export namespace IPageIRedditCommunityCommunityModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityCommunityModerator.ISummary[];
  };
}
