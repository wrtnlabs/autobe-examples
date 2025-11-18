import { IPage } from "./IPage";
import { IShoppingMallReviewHelpfulVote } from "./IShoppingMallReviewHelpfulVote";

export namespace IPageIShoppingMallReviewHelpfulVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewHelpfulVote.ISummary[];
  };
}
