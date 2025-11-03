import { IPage } from "./IPage";
import { ICivicBoardRateLimit } from "./ICivicBoardRateLimit";

export namespace IPageICivicBoardRateLimit {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICivicBoardRateLimit.ISummary[];
  };
}
