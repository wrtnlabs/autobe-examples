import { IPage } from "./IPage";
import { ICommunityPortalSubscription } from "./ICommunityPortalSubscription";

export namespace IPageICommunityPortalSubscription {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPortalSubscription.ISummary[];
  };
}
