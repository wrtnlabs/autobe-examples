import { IPage } from "./IPage";
import { IShoppingMallProductSku } from "./IShoppingMallProductSku";

export namespace IPageIShoppingMallProductSku {
  /**
   * Paginated collection of product SKU (variant) summaries for a single
   * catalog product.
   *
   * This schema is the response wrapper for the SKU search endpoint, for
   * example `PATCH /shoppingMall/products/{productCode}/skus`, which reads
   * from the `shopping_mall_product_skus` Prisma model. It delivers a list of
   * `IShoppingMallProductSku.ISummary` items together with pagination
   * metadata so that clients can browse and manage SKU variants associated
   * with a specific product identified by its business `productCode`.
   *
   * The `pagination` property exposes the page index, page size, total SKU
   * count, and total pages for the current search criteria (such as status
   * filters or sorting by price). The `data` array holds the individual SKU
   * summaries in the order determined by the request DTO. This layout follows
   * the platform-standard `IPage<T>` pattern, allowing front-end and
   * back-office applications to reuse shared pagination components when
   * listing SKU variants across different views.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * This object carries the standard pagination metadata shared across
     * all `IPage<T>` responses in the shopping mall API. It includes fields
     * such as the current page number, page size, total number of matching
     * SKUs, and number of pages, enabling clients to implement consistent
     * paging behavior for SKU lists.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each element in this array is an `IShoppingMallProductSku.ISummary`
     * DTO that represents a single SKU (stock keeping unit) variant of the
     * product being queried. These summaries expose core identifying and
     * pricing information—such as SKU id, business code, status, and price
     * amount—needed to render variant lists in storefronts and management
     * tools without loading full SKU detail payloads.
     */
    data: IShoppingMallProductSku.ISummary[];
  };
}
