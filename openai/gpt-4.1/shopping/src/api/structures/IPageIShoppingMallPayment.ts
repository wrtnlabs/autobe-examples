import { IPage } from "./IPage";
import { IShoppingMallPayment } from "./IShoppingMallPayment";

export namespace IPageIShoppingMallPayment {
  /**
   * A paginated response object for payment summary results from the payment
   * search API in the shopping mall backend.
   *
   * Designed for use in financial reconciliation, compliance audit, and
   * platform management dashboards, this object contains an array of payment
   * summaries conforming to financial reporting and audit standards for
   * online commerce. The pagination property details result windowing,
   * supporting high-volume data navigation by compliance staff and platform
   * administrators.
   *
   * This schema standardizes payment result representations for all platform
   * integrations, allowing modular visualization of payment flows, trends,
   * and cross-period reconciliation by both backend and external reporting
   * systems.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPayment.ISummary[];
  };
}
