import { IPage } from "./IPage";
import { ICommunityBbsNotification } from "./ICommunityBbsNotification";

export namespace IPageICommunityBbsNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBbsNotification.ISummary[];
  };
}
