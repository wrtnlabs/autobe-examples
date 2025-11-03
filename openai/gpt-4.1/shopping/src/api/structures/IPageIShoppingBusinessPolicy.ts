import { IPage } from "./IPage";
import { IShoppingBusinessPolicy } from "./IShoppingBusinessPolicy";

export namespace IPageIShoppingBusinessPolicy {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingBusinessPolicy.ISummary[];
  };
}
