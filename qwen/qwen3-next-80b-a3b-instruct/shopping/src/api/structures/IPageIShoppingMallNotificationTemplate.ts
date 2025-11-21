import { IPage } from "./IPage";
import { IShoppingMallNotificationTemplate } from "./IShoppingMallNotificationTemplate";

export namespace IPageIShoppingMallNotificationTemplate {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallNotificationTemplate.ISummary[];
  };
}
