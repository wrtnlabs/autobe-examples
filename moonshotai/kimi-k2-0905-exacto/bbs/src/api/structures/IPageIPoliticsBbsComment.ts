import { IPage } from "./IPage";
import { IPoliticsBbsComment } from "./IPoliticsBbsComment";

export namespace IPageIPoliticsBbsComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticsBbsComment.ISummary[];
  };
}
