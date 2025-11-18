import { IPage } from "./IPage";
import { IShoppingMallPolicyVersion } from "./IShoppingMallPolicyVersion";

export namespace IPageIShoppingMallPolicyVersion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPolicyVersion.ISummary[];
  };
}
