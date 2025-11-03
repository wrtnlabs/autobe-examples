import { IPage } from "./IPage";
import { IShoppingMallChannelDefinition } from "./IShoppingMallChannelDefinition";

export namespace IPageIShoppingMallChannelDefinition {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallChannelDefinition.ISummary[];
  };
}
