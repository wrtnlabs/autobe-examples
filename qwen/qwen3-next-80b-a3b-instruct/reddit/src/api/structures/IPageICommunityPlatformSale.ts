import { IPage } from "./IPage";
import { ICommunityPlatformSale } from "./ICommunityPlatformSale";

export namespace IPageICommunityPlatformSale {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformSale.ISummary[];
  };
}
