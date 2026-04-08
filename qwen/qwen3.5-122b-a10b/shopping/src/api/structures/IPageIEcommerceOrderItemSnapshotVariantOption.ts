import { IEcommerceOrderItemSnapshotVariantOption } from "./IEcommerceOrderItemSnapshotVariantOption";
import { IPage } from "./IPage";

export namespace IPageIEcommerceOrderItemSnapshotVariantOption {
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
     * @x-autobe-specification List of records of type IEcommerceOrderItemSnapshotVariantOption.ISummary.
     */
    data: IEcommerceOrderItemSnapshotVariantOption.ISummary[];
  };
}
