import { IEcommerceMallShipment } from "./IEcommerceMallShipment";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallShipment {
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
         *   IEcommerceMallShipment.ISummary.
     */
    data: IEcommerceMallShipment.ISummary[];
  };

  export namespace IDelivery {
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
             *   IEcommerceMallShipment.IDelivery.ISummary.
       */
      data: IEcommerceMallShipment.IDelivery.ISummary[];
    };
  }
}
