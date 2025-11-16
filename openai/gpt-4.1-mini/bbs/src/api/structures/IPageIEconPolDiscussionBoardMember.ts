import { IPage } from "./IPage";
import { IEconPolDiscussionBoardMember } from "./IEconPolDiscussionBoardMember";

export namespace IPageIEconPolDiscussionBoardMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPolDiscussionBoardMember.ISummary[];
  };
}
