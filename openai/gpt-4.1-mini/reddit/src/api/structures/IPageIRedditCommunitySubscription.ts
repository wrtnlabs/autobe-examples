import { IPage } from "./IPage";
import { IRedditCommunitySubscription } from "./IRedditCommunitySubscription";

export namespace IPageIRedditCommunitySubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunitySubscription.ISummary[];
  };
}
