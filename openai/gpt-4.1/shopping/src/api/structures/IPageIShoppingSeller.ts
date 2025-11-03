import { IPage } from "./IPage";
import { IShoppingSeller } from "./IShoppingSeller";

export namespace IPageIShoppingSeller {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingSeller.ISummary[];
  };
}
