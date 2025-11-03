import { IPage } from "./IPage";
import { IPoliticsBbsModerationReview } from "./IPoliticsBbsModerationReview";

export namespace IPageIPoliticsBbsModerationReview {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticsBbsModerationReview.ISummary[];
  };
}
