import { IPage } from "./IPage";
import { IShoppingMallEmailVerificationToken } from "./IShoppingMallEmailVerificationToken";

export namespace IPageIShoppingMallEmailVerificationToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallEmailVerificationToken.ISummary[];
  };
}
