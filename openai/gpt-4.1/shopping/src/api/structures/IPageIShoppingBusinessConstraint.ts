import { IPage } from "./IPage";
import { IShoppingBusinessConstraint } from "./IShoppingBusinessConstraint";

export namespace IPageIShoppingBusinessConstraint {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingBusinessConstraint.ISummary[];
  };
}
