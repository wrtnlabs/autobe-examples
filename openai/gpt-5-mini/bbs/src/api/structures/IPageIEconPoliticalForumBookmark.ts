import { IPage } from "./IPage";
import { IEconPoliticalForumBookmark } from "./IEconPoliticalForumBookmark";

export namespace IPageIEconPoliticalForumBookmark {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalForumBookmark.ISummary[];
  };
}
