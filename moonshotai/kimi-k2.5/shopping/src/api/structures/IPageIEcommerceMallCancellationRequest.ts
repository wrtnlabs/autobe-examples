import { IEcommerceMallCancellationRequest } from "./IEcommerceMallCancellationRequest";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallCancellationRequest {
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
         * @x-autobe-specification List of records of type
         *   IEcommerceMallCancellationRequest.ISummary.
     */
    data: IEcommerceMallCancellationRequest.ISummary[];
  };
}
