import { IPage } from "./IPage";
import { IShoppingRefundAttachment } from "./IShoppingRefundAttachment";

export namespace IPageIShoppingRefundAttachment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingRefundAttachment.ISummary[];
  };
}
