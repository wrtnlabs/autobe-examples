import { IPage } from "./IPage";
import { ICivicBoardReactionPolicy } from "./ICivicBoardReactionPolicy";

export namespace IPageICivicBoardReactionPolicy {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICivicBoardReactionPolicy.ISummary[];
  };
}
