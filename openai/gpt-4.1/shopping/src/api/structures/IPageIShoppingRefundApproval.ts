import { IPage } from "./IPage";
import { IShoppingRefundApproval } from "./IShoppingRefundApproval";

export namespace IPageIShoppingRefundApproval {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingRefundApproval.ISummary[];
  };
}
