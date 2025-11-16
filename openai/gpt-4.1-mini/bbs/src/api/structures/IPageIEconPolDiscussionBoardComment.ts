import { IPage } from "./IPage";
import { IEconPolDiscussionBoardComment } from "./IEconPolDiscussionBoardComment";

export namespace IPageIEconPolDiscussionBoardComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPolDiscussionBoardComment.ISummary[];
  };
}
