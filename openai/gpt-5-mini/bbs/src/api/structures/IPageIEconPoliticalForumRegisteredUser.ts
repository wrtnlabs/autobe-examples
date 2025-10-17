import { IPage } from "./IPage";
import { IEconPoliticalForumRegisteredUser } from "./IEconPoliticalForumRegisteredUser";

export namespace IPageIEconPoliticalForumRegisteredUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalForumRegisteredUser.ISummary[];
  };
}
