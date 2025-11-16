import { IPage } from "./IPage";
import { IEconPolDiscussionBoardGuestSession } from "./IEconPolDiscussionBoardGuestSession";

export namespace IPageIEconPolDiscussionBoardGuestSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPolDiscussionBoardGuestSession.ISummary[];
  };
}
