import { IPage } from "./IPage";
import { IRedditCommunityCommunityModerators } from "./IRedditCommunityCommunityModerators";

export namespace IPageIRedditCommunityCommunityModerators {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityCommunityModerators.ISummary[];
  };
}
