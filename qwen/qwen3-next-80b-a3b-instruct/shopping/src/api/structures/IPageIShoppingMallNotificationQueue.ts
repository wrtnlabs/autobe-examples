import { IPage } from "./IPage";
import { IShoppingMallNotificationQueue } from "./IShoppingMallNotificationQueue";

export namespace IPageIShoppingMallNotificationQueue {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallNotificationQueue.ISummary[];
  };
}
