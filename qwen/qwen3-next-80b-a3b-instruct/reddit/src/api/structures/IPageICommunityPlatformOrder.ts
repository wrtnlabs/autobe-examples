import { IPage } from "./IPage";
import { ICommunityPlatformOrder } from "./ICommunityPlatformOrder";

export namespace IPageICommunityPlatformOrder {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformOrder.ISummary[];
  };
}
