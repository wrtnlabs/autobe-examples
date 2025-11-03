import { IPage } from "./IPage";
import { IShoppingAdmin } from "./IShoppingAdmin";

export namespace IPageIShoppingAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingAdmin.ISummary[];
  };
}
