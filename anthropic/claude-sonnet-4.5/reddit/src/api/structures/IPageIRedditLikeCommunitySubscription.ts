import { IPage } from "./IPage";
import { IRedditLikeCommunitySubscription } from "./IRedditLikeCommunitySubscription";

export namespace IPageIRedditLikeCommunitySubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditLikeCommunitySubscription.ISummary[];
  };
}
