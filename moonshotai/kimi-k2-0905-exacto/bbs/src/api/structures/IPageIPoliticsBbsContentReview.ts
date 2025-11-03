import { IPage } from "./IPage";
import { IPoliticsBbsContentReview } from "./IPoliticsBbsContentReview";

export namespace IPageIPoliticsBbsContentReview {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticsBbsContentReview.ISummary[];
  };
}
