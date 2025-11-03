import { IPage } from "./IPage";
import { ICivicBoardPostAttachment } from "./ICivicBoardPostAttachment";

export namespace IPageICivicBoardPostAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICivicBoardPostAttachment.ISummary[];
  };
}
