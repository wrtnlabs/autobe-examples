import { IPage } from "./IPage";
import { IShoppingPasswordReset } from "./IShoppingPasswordReset";

export namespace IPageIShoppingPasswordReset {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingPasswordReset.ISummary[];
  };
}
