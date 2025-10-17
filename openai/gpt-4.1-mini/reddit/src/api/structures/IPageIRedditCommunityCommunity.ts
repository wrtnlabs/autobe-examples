import { IPage } from "./IPage";
import { IRedditCommunityCommunity } from "./IRedditCommunityCommunity";

export namespace IPageIRedditCommunityCommunity {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityCommunity.ISummary[];
  };
}
