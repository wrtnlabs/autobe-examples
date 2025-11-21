import { IPage } from "./IPage";
import { IStatisticsTopProducts } from "./IStatisticsTopProducts";

export namespace IPageIStatisticsTopProducts {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStatisticsTopProducts.ISummary[];
  };
}
