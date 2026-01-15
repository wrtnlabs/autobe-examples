import { IPage } from "./IPage";
import { ICommunityPlatformProductReview } from "./ICommunityPlatformProductReview";

export namespace IPageICommunityPlatformProductReview {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformProductReview.ISummary[];
  };
}
