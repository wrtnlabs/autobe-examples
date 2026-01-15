import { IPage } from "./IPage";
import { ICommunityPlatformPromotion } from "./ICommunityPlatformPromotion";

export namespace IPageICommunityPlatformPromotion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPromotion.ISummary[];
  };
}
