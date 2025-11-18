import { IPage } from "./IPage";
import { IShoppingMallDisputeEvidence } from "./IShoppingMallDisputeEvidence";

export namespace IPageIShoppingMallDisputeEvidence {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallDisputeEvidence.ISummary[];
  };
}
