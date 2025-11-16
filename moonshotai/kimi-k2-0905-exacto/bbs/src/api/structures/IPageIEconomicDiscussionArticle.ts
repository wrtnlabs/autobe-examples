import { IPage } from "./IPage";
import { IEconomicDiscussionArticle } from "./IEconomicDiscussionArticle";

export namespace IPageIEconomicDiscussionArticle {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicDiscussionArticle.ISummary[];
  };
}
