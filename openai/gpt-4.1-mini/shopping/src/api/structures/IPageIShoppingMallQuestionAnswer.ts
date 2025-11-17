import { IPage } from "./IPage";
import { IShoppingMallQuestionAnswer } from "./IShoppingMallQuestionAnswer";

export namespace IPageIShoppingMallQuestionAnswer {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallQuestionAnswer.ISummary[];
  };
}
