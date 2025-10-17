import { IPage } from "./IPage";
import { IEconPoliticalForumTag } from "./IEconPoliticalForumTag";

export namespace IPageIEconPoliticalForumTag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalForumTag.ISummary[];
  };
}
