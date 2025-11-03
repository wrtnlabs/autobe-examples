import { IPage } from "./IPage";
import { IShoppingAttributeDimension } from "./IShoppingAttributeDimension";

export namespace IPageIShoppingAttributeDimension {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingAttributeDimension.ISummary[];
  };
}
