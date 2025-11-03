import { IPage } from "./IPage";
import { ICommunityBbsUserSubscription } from "./ICommunityBbsUserSubscription";

export namespace IPageICommunityBbsUserSubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsUserSubscription.ISummary[];
  };
}
