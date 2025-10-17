import { IPage } from "./IPage";
import { IShoppingMallShoppingMallSku } from "./IShoppingMallShoppingMallSku";

export namespace IPageIShoppingMallShoppingMallSku {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShoppingMallSku.ISummary[];
  };
}
