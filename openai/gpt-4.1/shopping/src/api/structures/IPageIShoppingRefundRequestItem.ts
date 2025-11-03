import { IPage } from "./IPage";
import { IShoppingRefundRequestItem } from "./IShoppingRefundRequestItem";

export namespace IPageIShoppingRefundRequestItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingRefundRequestItem.ISummary[];
  };
}
