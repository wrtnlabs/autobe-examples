import { IPage } from "./IPage";
import { IShoppingSku } from "./IShoppingSku";

export namespace IPageIShoppingSku {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingSku.ISummary[];
  };
}
