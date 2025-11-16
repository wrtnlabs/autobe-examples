import { IPage } from "./IPage";
import { IShoppingMallOrderAuditLog } from "./IShoppingMallOrderAuditLog";

export namespace IPageIShoppingMallOrderAuditLog {
  /**
   * A paginated response object for audit log event summaries from a shopping
   * mall order audit log search operation.
   *
   * This object structure is used for complex compliance, business trace, and
   * admin support workflows, providing not only result data but also rich
   * pagination details needed for dashboard rendering and log review
   * processes. The object includes an array of audit log summaries (each with
   * contextual detail) and a comprehensive pagination sub-object allowing
   * APIs and UIs to represent result ranges, page navigation, and record
   * totals deterministically.
   *
   * By standardizing audit log search responses in this way, developers,
   * compliance analysts, and customer support staff can efficiently process,
   * trace, and review the full lifecycle of all significant order actions on
   * the platform.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderAuditLog.ISummary[];
  };
}
