import { IPage } from "./IPage";
import { IShoppingMallCustomerQuestion } from "./IShoppingMallCustomerQuestion";

export namespace IPageIShoppingMallCustomerQuestion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCustomerQuestion.ISummary[];
  };
}
