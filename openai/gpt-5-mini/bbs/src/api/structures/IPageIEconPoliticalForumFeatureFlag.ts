import { IPage } from "./IPage";
import { IEconPoliticalForumFeatureFlag } from "./IEconPoliticalForumFeatureFlag";

export namespace IPageIEconPoliticalForumFeatureFlag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconPoliticalForumFeatureFlag.ISummary[];
  };
}
