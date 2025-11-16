import { IPage } from "./IPage";
import { IEconomicBoardCitizen } from "./IEconomicBoardCitizen";

export namespace IPageIEconomicBoardCitizen {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicBoardCitizen.ISummary[];
  };
}
