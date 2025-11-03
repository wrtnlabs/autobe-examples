import { IPage } from "./IPage";
import { IPoliticsBbsArticle } from "./IPoliticsBbsArticle";

export namespace IPageIPoliticsBbsArticle {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticsBbsArticle.ISummary[];
  };
}
