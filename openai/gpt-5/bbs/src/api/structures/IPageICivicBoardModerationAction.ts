import { IPage } from "./IPage";
import { ICivicBoardModerationAction } from "./ICivicBoardModerationAction";

export namespace IPageICivicBoardModerationAction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICivicBoardModerationAction.ISummary[];
  };
}
