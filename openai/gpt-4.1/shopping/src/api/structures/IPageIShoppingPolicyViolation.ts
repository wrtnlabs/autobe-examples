import { IPage } from "./IPage";
import { IShoppingPolicyViolation } from "./IShoppingPolicyViolation";

export namespace IPageIShoppingPolicyViolation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingPolicyViolation.ISummary[];
  };
}
