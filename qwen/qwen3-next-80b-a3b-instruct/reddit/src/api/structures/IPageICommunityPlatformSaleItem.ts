import { IPage } from "./IPage";
import { ICommunityPlatformSaleItem } from "./ICommunityPlatformSaleItem";

export namespace IPageICommunityPlatformSaleItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformSaleItem.ISummary[];
  };
}
