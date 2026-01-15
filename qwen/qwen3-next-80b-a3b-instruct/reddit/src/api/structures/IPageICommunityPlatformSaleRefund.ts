import { IPage } from "./IPage";
import { ICommunityPlatformRefund } from "./ICommunityPlatformRefund";

export namespace IPageICommunityPlatformSaleRefund {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformRefund.ISummary[];
  };
}
