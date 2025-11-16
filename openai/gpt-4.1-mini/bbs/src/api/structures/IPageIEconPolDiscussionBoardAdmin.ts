import { IPage } from "./IPage";
import { IEconPolDiscussionBoardAdmin } from "./IEconPolDiscussionBoardAdmin";

export namespace IPageIEconPolDiscussionBoardAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPolDiscussionBoardAdmin.ISummary[];
  };
}
