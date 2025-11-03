import { IPage } from "./IPage";
import { IShoppingMallPlatformAuditLog } from "./IShoppingMallPlatformAuditLog";

export namespace IPageIShoppingMallPlatformAuditLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IRequest = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPlatformAuditLog.IRequest[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPlatformAuditLog.ISummary[];
  };
}
