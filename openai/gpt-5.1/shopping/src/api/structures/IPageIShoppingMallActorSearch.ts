import { IPage } from "./IPage";
import { IShoppingMallActorSearch } from "./IShoppingMallActorSearch";

export namespace IPageIShoppingMallActorSearch {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallActorSearch.ISummary[];
  };
}
