import { IPage } from "./IPage";
import { IShoppingMallEscalationQueue } from "./IShoppingMallEscalationQueue";

export namespace IPageIShoppingMallEscalationQueue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   *
   * This schema is used to represent paginated results for business
   * escalation or dispute queue summaries within the shopping mall platform.
   * It supports efficient list view, triage, and operational workflows for
   * platform governance cases.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallEscalationQueue.ISummary[];
  };
}
