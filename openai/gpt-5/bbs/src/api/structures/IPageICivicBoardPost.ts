import { IPage } from "./IPage";
import { ICivicBoardPost } from "./ICivicBoardPost";

export namespace IPageICivicBoardPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICivicBoardPost.ISummary[];
  };
}
