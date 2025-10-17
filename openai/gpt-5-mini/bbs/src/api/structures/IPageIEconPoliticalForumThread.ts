import { IPage } from "./IPage";
import { IEconPoliticalForumThread } from "./IEconPoliticalForumThread";

export namespace IPageIEconPoliticalForumThread {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalForumThread.ISummary[];
  };
}
