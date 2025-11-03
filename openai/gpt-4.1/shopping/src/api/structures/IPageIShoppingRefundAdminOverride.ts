import { IPage } from "./IPage";
import { IShoppingRefundAdminOverride } from "./IShoppingRefundAdminOverride";

export namespace IPageIShoppingRefundAdminOverride {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingRefundAdminOverride.ISummary[];
  };
}
