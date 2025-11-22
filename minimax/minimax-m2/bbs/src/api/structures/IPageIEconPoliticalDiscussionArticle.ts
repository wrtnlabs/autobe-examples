import { IPage } from "./IPage";
import { IEconPoliticalDiscussionArticle } from "./IEconPoliticalDiscussionArticle";

export namespace IPageIEconPoliticalDiscussionArticle {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalDiscussionArticle.ISummary[];
  };
}
