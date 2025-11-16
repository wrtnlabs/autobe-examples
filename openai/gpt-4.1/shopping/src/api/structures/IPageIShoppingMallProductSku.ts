import { IPage } from "./IPage";
import { IShoppingMallProductSku } from "./IShoppingMallProductSku";

export namespace IPageIShoppingMallProductSku {
  /**
   * Paginated container for shopping mall product SKUs associated with a
   * catalog product in list/search flows.
   *
   * Intended to deliver page-based results for endpoints such as GET/patch
   * /shoppingMall/products/{productId}/skus or equivalent. Aggregates two
   * elements:
   *
   * - 'pagination': Information about total records, page number, and
   *   navigation state within the paginated result set.
   * - 'data': Array of individual SKU summary objects (variants/options), each
   *   encapsulating high-level info for UI or downstream system use.
   *
   * This type ensures UX/business logic consistency across all result-listing
   * operations in the product management and SKU/variant inventory management
   * domains. Used as a standard response envelope for all SKU list endpoints,
   * allowing seamless data paging in large shopping catalogues.
   */
  export type ISummary = {
    /**
     * Object containing metadata for paginated results in API responses.
     *
     * Describes current page, page size (limit), total number of records,
     * and pages, enabling clients to implement navigation controls or
     * infinite scrolling in product or inventory management interfaces.
     *
     * Follows the IPage.IPagination interface for consistent structure
     * across shopping mall search endpoints.
     */
    pagination: IPage.IPagination;

    /**
     * Array containing summary objects for product SKUs attached to the
     * reference product entity, as returned by paginated search or list
     * endpoints.
     *
     * Each summary object follows the IShoppingMallProductSku.ISummary type
     * and represents a single SKU (variant/option) under the product
     * catalog context. These summaries are designed for use in list or
     * table UI views for inventory operations, selection dialogs,
     * cart/checkout options, or analytic/reporting contexts.
     */
    data: IShoppingMallProductSku.ISummary[];
  };
}
