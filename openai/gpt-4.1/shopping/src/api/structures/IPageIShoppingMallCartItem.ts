import { IPage } from "./IPage";
import { IShoppingMallCartItem } from "./IShoppingMallCartItem";

export namespace IPageIShoppingMallCartItem {
  /**
   * Paginated result set representing the summary view of all items in a
   * customer's shopping cart instance.
   *
   * This object delivers cart item summary records using a paged, filterable
   * structure for UI rendering, API responses, or operational review.
   * 'pagination' provides full navigational context, while 'data' is an array
   * of cart item summaries referencing SKUs, quantities, and modification
   * timestamps.
   *
   * Designed for use in customer- or client-facing endpoints to support cart
   * management workflows, checkout preparation, and customer engagement
   * tracking. Enables scalable list presentation and fine-grained operational
   * logic for in-cart activity.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCartItem.ISummary[];
  };
}
