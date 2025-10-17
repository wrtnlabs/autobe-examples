import { IPage } from "./IPage";
import { IEconPoliticalForumNotification } from "./IEconPoliticalForumNotification";

export namespace IPageIEconPoliticalForumNotification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalForumNotification.ISummary[];
  };
}
