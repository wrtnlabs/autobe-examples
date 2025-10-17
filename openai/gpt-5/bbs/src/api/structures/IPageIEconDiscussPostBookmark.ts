import { IPage } from "./IPage";
import { IEconDiscussPostBookmark } from "./IEconDiscussPostBookmark";

export namespace IPageIEconDiscussPostBookmark {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconDiscussPostBookmark.ISummary[];
  };
}
