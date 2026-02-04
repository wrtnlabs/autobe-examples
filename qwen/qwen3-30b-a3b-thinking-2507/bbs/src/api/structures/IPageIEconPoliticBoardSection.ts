import { IEconPoliticBoardSection } from "./IEconPoliticBoardSection";
import { IPage } from "./IPage";

export namespace IPageIEconPoliticBoardSection {
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
     * @x-autobe-specification List of records of type IEconPoliticBoardSection.ISummary.
     */
    data: IEconPoliticBoardSection.ISummary[];
  };
}
