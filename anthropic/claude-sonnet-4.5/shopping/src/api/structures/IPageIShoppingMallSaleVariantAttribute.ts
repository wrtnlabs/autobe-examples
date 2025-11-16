import { IPage } from "./IPage";
import { IShoppingMallSaleVariantAttribute } from "./IShoppingMallSaleVariantAttribute";

export namespace IPageIShoppingMallSaleVariantAttribute {
  /**
   * Paginated response containing variant attribute summaries for a product
   * sale listing.
   *
   * This response wrapper combines pagination metadata with an array of
   * variant attribute records from the shopping_mall_sale_variant_attributes
   * table. Variant attributes define the configurable dimensions of a product
   * (such as Color, Size, Material, Style) that buyers can select to
   * customize their purchase.
   *
   * Pagination is essential for products with complex variant configurations
   * that may have multiple attributes (up to 3 per product). While individual
   * products typically have 1-3 attributes, the pagination structure supports
   * efficient data transfer and consistent API patterns across all listing
   * operations.
   *
   * Typical usage scenarios include:
   *
   * - Product management interfaces where sellers configure variant options
   * - Buyer-facing product pages displaying available customization dimensions
   * - Variant configuration tools that allow filtering and searching attributes
   * - Administrative dashboards monitoring product variant structures
   *
   * The paginated structure enables efficient handling of variant attribute
   * queries with filtering, sorting, and search capabilities while
   * maintaining reasonable response sizes and optimal client-side
   * performance.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through variant attribute result
     * sets.
     *
     * Provides information about the current page position, total pages
     * available, total record count, and page size limits. Essential for
     * implementing paginated navigation controls in variant attribute
     * management interfaces.
     */
    pagination: IPage.IPagination;

    /**
     * Array of variant attribute summary records for the current page.
     *
     * Contains the actual variant attribute data matching the search
     * criteria, with each element representing one variant dimension (such
     * as Color, Size, or Material) configured for the product sale. Each
     * attribute includes its available values that buyers can select.
     */
    data: IShoppingMallSaleVariantAttribute.ISummary[];
  };
}
