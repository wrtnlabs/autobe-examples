import { IPage } from "./IPage";
import { IEconomicBoardModerator } from "./IEconomicBoardModerator";

export namespace IPageIEconomicBoardModerator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicBoardModerator.ISummary[];
  };
}
