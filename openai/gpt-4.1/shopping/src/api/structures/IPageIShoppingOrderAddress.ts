import { IPage } from "./IPage";
import { IShoppingOrderAddress } from "./IShoppingOrderAddress";

export namespace IPageIShoppingOrderAddress {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingOrderAddress.ISummary[];
  };
}
