import { IPage } from "./IPage";
import { IShoppingStatusEnum } from "./IShoppingStatusEnum";

export namespace IPageIShoppingStatusEnum {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingStatusEnum.ISummary[];
  };
}
