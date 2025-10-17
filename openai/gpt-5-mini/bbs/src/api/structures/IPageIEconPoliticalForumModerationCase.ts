import { IPage } from "./IPage";
import { IEconPoliticalForumModerationCase } from "./IEconPoliticalForumModerationCase";

export namespace IPageIEconPoliticalForumModerationCase {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalForumModerationCase.ISummary[];
  };
}
