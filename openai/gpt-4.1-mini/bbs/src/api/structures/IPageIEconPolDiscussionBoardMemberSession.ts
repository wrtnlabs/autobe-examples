import { IPage } from "./IPage";
import { IEconPolDiscussionBoardMemberSession } from "./IEconPolDiscussionBoardMemberSession";

export namespace IPageIEconPolDiscussionBoardMemberSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPolDiscussionBoardMemberSession.ISummary[];
  };
}
