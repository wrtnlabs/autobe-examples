import { IPage } from "./IPage";
import { IEconomicBoardAdmin } from "./IEconomicBoardAdmin";

export namespace IPageIEconomicBoardAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicBoardAdmin.ISummary[];
  };
}
