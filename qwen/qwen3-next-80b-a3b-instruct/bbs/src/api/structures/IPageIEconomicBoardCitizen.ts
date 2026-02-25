import { IEconomicBoardCitizen } from "./IEconomicBoardCitizen";
import { IPage } from "./IPage";

export namespace IPageIEconomicBoardCitizen {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IS = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IEconomicBoardCitizen.IS.
     */
    data: IEconomicBoardCitizen.IS[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IEconomicBoardCitizen.ISummary.
     */
    data: IEconomicBoardCitizen.ISummary[];
  };
}
