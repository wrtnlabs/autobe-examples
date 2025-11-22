import { IPage } from "./IPage";
import { IEconPoliticalDiscussionUser } from "./IEconPoliticalDiscussionUser";

export namespace IPageIEconPoliticalDiscussionUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalDiscussionUser.ISummary[];
  };
}
