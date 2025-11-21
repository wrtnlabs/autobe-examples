import { IPage } from "./IPage";
import { IStatisticsProductCategorySales } from "./IStatisticsProductCategorySales";

export namespace IPageIStatisticsProductCategorySales {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStatisticsProductCategorySales.ISummary[];
  };
}
