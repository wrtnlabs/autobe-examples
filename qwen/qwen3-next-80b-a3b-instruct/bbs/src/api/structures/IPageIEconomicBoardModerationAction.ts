import { IPage } from "./IPage";
import { IEconomicBoardModerationAction } from "./IEconomicBoardModerationAction";

export namespace IPageIEconomicBoardModerationAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicBoardModerationAction.ISummary[];
  };
}
