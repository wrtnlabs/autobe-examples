import { IPage } from "./IPage";
import { ICivicBoardComment } from "./ICivicBoardComment";

export namespace IPageICivicBoardComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICivicBoardComment.ISummary[];
  };
}
