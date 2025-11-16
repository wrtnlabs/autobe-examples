import { IPage } from "./IPage";
import { IShoppingMallFaq } from "./IShoppingMallFaq";

export namespace IPageIShoppingMallFaq {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallFaq.ISummary[];
  };
}
