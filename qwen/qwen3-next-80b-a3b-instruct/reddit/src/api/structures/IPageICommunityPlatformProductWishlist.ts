import { IPage } from "./IPage";
import { ICommunityPlatformProductWishlist } from "./ICommunityPlatformProductWishlist";

export namespace IPageICommunityPlatformProductWishlist {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformProductWishlist.ISummary[];
  };
}
