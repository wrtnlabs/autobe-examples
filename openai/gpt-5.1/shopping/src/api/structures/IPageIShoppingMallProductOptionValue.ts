import { IPage } from "./IPage";
import { IShoppingMallProductOptionValue } from "./IShoppingMallProductOptionValue";

export namespace IPageIShoppingMallProductOptionValue {
  /**
   * Paginated collection of product option value summaries for a specific
   * product option type.
   *
   * This schema wraps the result set returned by the option value search
   * endpoint, for example `PATCH
   * /shoppingMall/products/{productCode}/optionTypes/{productOptionTypeId}/values`,
   * which queries records from the `shopping_mall_product_option_values`
   * Prisma model. It combines the list of
   * `IShoppingMallProductOptionValue.ISummary` items with standard pagination
   * metadata so that clients can render list UIs and implement paging
   * controls.
   *
   * The `pagination` property contains the current page index, page size,
   * total record count, and derived total pages for the current query. The
   * `data` array contains the actual option value summaries in the order
   * defined by the search criteria (such as `display_order` or creation
   * timestamp). This structure is intentionally generic and consistent with
   * other `IPage<T>` wrappers in the platform so that client code can reuse
   * common pagination handling across different entities.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * This object exposes the standard pagination metadata such as the
     * current page index, page size, total record count, and total page
     * count. It maps directly to the shared `IPage.IPagination` schema that
     * is reused across the shopping mall backend for all paginated list
     * responses.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each element in this array is a
     * `IShoppingMallProductOptionValue.ISummary` DTO representing a single
     * product option value belonging to a specific option type of a
     * product. The summaries provide lightweight information such as the
     * option value identifier, raw value, and optional display label, which
     * are sufficient for rendering configuration and storefront UIs without
     * loading full detail records.
     */
    data: IShoppingMallProductOptionValue.ISummary[];
  };
}
