import { IPage } from "./IPage";
import { IEconomicBoardCategory } from "./IEconomicBoardCategory";

export namespace IPageIEconomicBoardCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicBoardCategory.ISummary[];
  };
}
