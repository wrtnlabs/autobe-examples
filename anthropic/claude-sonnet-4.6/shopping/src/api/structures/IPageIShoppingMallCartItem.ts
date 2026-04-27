import { IPage } from "./IPage";
import { IShoppingMallCartItem } from "./IShoppingMallCartItem";

export namespace IPageIShoppingMallCartItem {
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
     * @x-autobe-specification List of records of type IShoppingMallCartItem.ISummary.
     */
    data: IShoppingMallCartItem.ISummary[];

    /**
     * Sum of all subtotals across ALL cart items belonging to the customer,
     * regardless of the current page. Enables displaying the cart total without
     * paginating through every item.
     *
     * @x-autobe-specification Computed as SUM(effective_unit_price * quantity)
     * for every active cart item of the authenticated customer, where
     * effective_unit_price = variant.price_override ?? product.base_price.
     */
    totalAmount: number;
  };
}
