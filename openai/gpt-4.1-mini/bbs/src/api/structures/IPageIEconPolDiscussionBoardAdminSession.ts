import { IPage } from "./IPage";
import { IEconPolDiscussionBoardAdminSession } from "./IEconPolDiscussionBoardAdminSession";

export namespace IPageIEconPolDiscussionBoardAdminSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPolDiscussionBoardAdminSession.ISummary[];
  };
}
