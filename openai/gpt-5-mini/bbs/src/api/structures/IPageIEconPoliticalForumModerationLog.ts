import { IPage } from "./IPage";
import { IEconPoliticalForumModerationLog } from "./IEconPoliticalForumModerationLog";

export namespace IPageIEconPoliticalForumModerationLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalForumModerationLog.ISummary[];
  };
}
