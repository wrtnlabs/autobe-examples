import { IPage } from "./IPage";
import { IShoppingMallMonitoringAlert } from "./IShoppingMallMonitoringAlert";

export namespace IPageIShoppingMallMonitoringAlert {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallMonitoringAlert.ISummary[];
  };
}
