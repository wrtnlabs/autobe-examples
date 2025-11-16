import { IPage } from "./IPage";
import { IShoppingMallProductComplianceFlag } from "./IShoppingMallProductComplianceFlag";

export namespace IPageIShoppingMallProductComplianceFlag {
  /**
   * Paginated collection of product compliance flag summaries for a single
   * catalog product.
   *
   * This page wrapper is typically returned by administrative search
   * operations such as
   * `/shoppingMall/platformAdmin/products/{productCode}/complianceFlags`,
   * where the path `productCode` is first resolved to a
   * `shopping_mall_products` row and then used to load related records from
   * `shopping_mall_product_compliance_flags`. The `pagination` property
   * describes which portion of the overall result set is being returned,
   * while `data` holds the individual
   * `IShoppingMallProductComplianceFlag.ISummary` items.
   *
   * Use this type whenever you need to present a scrollable or paginated
   * table of compliance flags for a product in back-office tools, dashboards,
   * or policy review workflows. It is optimized for read-only list views and
   * does not itself encode any mutation or filtering logic, which is instead
   * provided by request-side DTOs such as
   * `IShoppingMallProductComplianceFlag.IRequest`. By structuring results in
   * this way, the API keeps list responses consistent across domains and
   * makes it easier to compose generic pagination and table components.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of compliance flag
     * results.
     *
     * This property mirrors the common `IPage.IPagination` structure used
     * across the shoppingMall platform, exposing fields such as the current
     * page index, page size, total record count, and total page count. It
     * allows administrative tools to drive paging controls (for example,
     * next/previous navigation or page size selectors) when browsing
     * compliance flags for a product.
     */
    pagination: IPage.IPagination;

    /**
     * Array of compliance flag summary records for the target product.
     *
     * Each element is an `IShoppingMallProductComplianceFlag.ISummary`
     * instance representing a single row from the
     * `shopping_mall_product_compliance_flags` Prisma model. Together,
     * these records surface the regulatory and policy-related flags (such
     * as age restrictions, hazardous materials, or region-based
     * restrictions) that have been attached to the product resolved by
     * `productCode` in operations like
     * `/shoppingMall/platformAdmin/products/{productCode}/complianceFlags`.
     */
    data: IShoppingMallProductComplianceFlag.ISummary[];
  };
}
