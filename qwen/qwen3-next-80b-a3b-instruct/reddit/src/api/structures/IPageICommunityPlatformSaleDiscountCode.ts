import { IPage } from "./IPage";
import { ICommunityPlatformSaleDiscountCode } from "./ICommunityPlatformSaleDiscountCode";

export namespace IPageICommunityPlatformSaleDiscountCode {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformSaleDiscountCode.ISummary[];
  };
}
