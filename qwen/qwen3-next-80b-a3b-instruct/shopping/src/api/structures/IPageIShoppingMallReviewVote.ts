import { IPage } from "./IPage";
import { IShoppingMallReviewVote } from "./IShoppingMallReviewVote";

export namespace IPageIShoppingMallReviewVote {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewVote.ISummary[];
  };
}
