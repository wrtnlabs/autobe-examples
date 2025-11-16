import { IPage } from "./IPage";
import { IShoppingMallSkuOptionValueAssignment } from "./IShoppingMallSkuOptionValueAssignment";

export namespace IPageIShoppingMallSkuOptionValueAssignment {
  /**
   * Paginated collection of SKU option value assignment summaries for a
   * specific product SKU in the shopping mall catalog.
   *
   * This DTO wraps a page of `IShoppingMallSkuOptionValueAssignment.ISummary`
   * records derived from the `shopping_mall_sku_option_value_assignments`
   * Prisma model, scoped to a particular product and SKU as indicated by the
   * API path parameters (for example,
   * `/shoppingMall/customer/products/{productCode}/skus/{skuCode}/optionValueAssignments`).
   * It is returned by search/list operations used by both customer-facing and
   * seller-facing UIs to inspect how a SKU is composed from individual option
   * values.
   *
   * The `pagination` property describes the current page index, page size,
   * and overall record counts, while the `data` array contains the actual
   * assignment summaries for the requested page. Clients rely on this
   * structure to render tabular or list views of variant compositions and to
   * navigate through potentially large numbers of assignment records without
   * loading the entire dataset at once.
   */
  export type ISummary = {
    /**
     * Pagination information for the current slice of SKU option value
     * assignments.
     *
     * Contains the zero-based page index, page size, total record count,
     * and total page count for the list of
     * `shopping_mall_sku_option_value_assignments` rows returned to the
     * client. UI components use this object to render paging controls and
     * to request subsequent pages of option value assignments for the same
     * product and SKU context.
     */
    pagination: IPage.IPagination;

    /**
     * List of SKU option value assignment summaries contained in the
     * current page.
     *
     * Each element is an `IShoppingMallSkuOptionValueAssignment.ISummary`
     * DTO representing the association between a specific product SKU and a
     * concrete option value, derived from the
     * `shopping_mall_sku_option_value_assignments` Prisma model and its
     * relations to `shopping_mall_product_skus` and
     * `shopping_mall_product_option_values`. The records are already
     * filtered to the product and SKU identified by the calling endpoint’s
     * path parameters and may be further filtered and sorted based on the
     * request’s search criteria.
     */
    data: IShoppingMallSkuOptionValueAssignment.ISummary[];
  };
}
