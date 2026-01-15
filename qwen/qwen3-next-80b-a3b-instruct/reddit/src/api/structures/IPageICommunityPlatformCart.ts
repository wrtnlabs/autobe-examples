import { IPage } from "./IPage";
import { ICommunityPlatformCart } from "./ICommunityPlatformCart";

export namespace IPageICommunityPlatformCart {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCart.ISummary[];
  };
}
