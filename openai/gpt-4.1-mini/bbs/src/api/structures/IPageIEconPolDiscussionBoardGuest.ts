import { IPage } from "./IPage";
import { IEconPolDiscussionBoardGuest } from "./IEconPolDiscussionBoardGuest";

export namespace IPageIEconPolDiscussionBoardGuest {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPolDiscussionBoardGuest.ISummary[];
  };
}
