import { IPage } from "./IPage";
import { IShoppingMallSaleVariantValue } from "./IShoppingMallSaleVariantValue";

export namespace IPageIShoppingMallSaleVariantValue {
  /**
   * Paginated response containing variant value summaries for a specific
   * variant attribute within a product sale.
   *
   * This response wrapper combines pagination metadata with an array of
   * variant value records from the shopping_mall_sale_variant_values table.
   * Variant values represent the individual selectable options within a
   * variant attribute dimension - for example, specific colors (Red, Blue,
   * Green) within a Color attribute, or sizes (S, M, L, XL) within a Size
   * attribute.
   *
   * Pagination is particularly important for variant values because a single
   * attribute can contain up to 50 distinct values. Products with extensive
   * option ranges (like detailed color palettes with 30+ shades, or
   * comprehensive size charts with 20+ sizes) benefit from paginated loading
   * to maintain responsive user interfaces and efficient data transfer.
   *
   * Typical usage scenarios include:
   *
   * - Seller variant configuration interfaces managing large value sets
   * - Product variant management tools with search and filtering for specific
   *   values
   * - SKU generation workflows that combine values across attributes
   * - Administrative monitoring of variant value completeness and organization
   * - Bulk value management operations with filtering and sorting
   *
   * The paginated structure supports efficient handling of variant value
   * queries with search, filtering by display order or creation date, and
   * sorting capabilities. This ensures optimal performance even when managing
   * products with complex variant configurations containing dozens of
   * selectable options per attribute.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through variant value result sets.
     *
     * Provides current page position, total available pages, total record
     * count, and page size information. Critical for implementing
     * pagination controls when managing variant values that may number in
     * the dozens for attributes like Color or Size.
     */
    pagination: IPage.IPagination;

    /**
     * Array of variant value summary records for the current page.
     *
     * Contains the actual variant value options matching the search
     * criteria. Each element represents one selectable option within a
     * variant attribute (e.g., 'Red', 'Blue', 'Green' for a Color
     * attribute, or 'S', 'M', 'L', 'XL' for a Size attribute). These values
     * combine across attributes to generate the complete SKU matrix.
     */
    data: IShoppingMallSaleVariantValue.ISummary[];
  };
}
