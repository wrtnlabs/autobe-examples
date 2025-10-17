import { IPage } from "./IPage";
import { IRedditLikeCommunity } from "./IRedditLikeCommunity";

export namespace IPageIRedditLikeCommunity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditLikeCommunity.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISubscriptionSummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditLikeCommunity.ISubscriptionSummary[];
  };
}
