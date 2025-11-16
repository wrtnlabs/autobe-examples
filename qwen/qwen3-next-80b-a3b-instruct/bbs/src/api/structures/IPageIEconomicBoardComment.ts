import { IPage } from "./IPage";
import { IEconomicBoardComment } from "./IEconomicBoardComment";

export namespace IPageIEconomicBoardComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicBoardComment.ISummary[];
  };
}
