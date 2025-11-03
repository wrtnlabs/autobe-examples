import { IPage } from "./IPage";
import { ICivicBoardPolicy } from "./ICivicBoardPolicy";

export namespace IPageICivicBoardPolicy {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICivicBoardPolicy.ISummary[];
  };
}
