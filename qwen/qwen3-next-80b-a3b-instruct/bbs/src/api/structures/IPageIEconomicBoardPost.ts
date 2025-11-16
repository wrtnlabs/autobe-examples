import { IPage } from "./IPage";
import { IEconomicBoardPost } from "./IEconomicBoardPost";

export namespace IPageIEconomicBoardPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicBoardPost.ISummary[];
  };
}
