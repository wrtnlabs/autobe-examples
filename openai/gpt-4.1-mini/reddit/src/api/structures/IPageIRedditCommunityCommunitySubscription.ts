import { IPage } from "./IPage";
import { IRedditCommunityCommunitySubscription } from "./IRedditCommunityCommunitySubscription";

export namespace IPageIRedditCommunityCommunitySubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityCommunitySubscription.ISummary[];
  };
}
