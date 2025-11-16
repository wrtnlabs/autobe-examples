import { IPage } from "./IPage";
import { IEconomicDiscussionSystemSetting } from "./IEconomicDiscussionSystemSetting";

export namespace IPageIEconomicDiscussionSystemSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicDiscussionSystemSetting.ISummary[];
  };
}
