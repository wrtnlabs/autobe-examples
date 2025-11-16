import { IPage } from "./IPage";
import { IShoppingMallProductAttribute } from "./IShoppingMallProductAttribute";

export namespace IPageIShoppingMallProductAttribute {
  /**
   * Paginated collection of product attribute definitions for catalog variant
   * management.
   *
   * This schema represents a single page of product attribute summary data
   * (color, size, material, etc.) for a specified shopping mall product, as
   * returned by the attribute search endpoints. Used in both seller and admin
   * contexts for managing allowed variant configuration options per product.
   *
   * The 'pagination' property provides standard paging information to support
   * list navigation. The 'data' array contains summary records for each
   * logical attribute definition, enabling variant picker UI logic, bulk
   * editing, and efficient catalog operations.
   *
   * Returned by PATCH /shoppingMall/seller/products/{productId}/attributes
   * and /shoppingMall/admin/products/{productId}/attributes, supporting
   * advanced filtering, searching, and navigation in B2B or B2C platform
   * workflows.
   */
  export type ISummary = {
    /**
     * Standard page navigation and total record information for the
     * attribute definition list.
     *
     * Includes current page index, result limit, record count, and total
     * page calculation for navigating through large or complex catalog
     * attribute sets as encountered in modern e-commerce or B2B catalog
     * platforms.
     */
    pagination: IPage.IPagination;

    /**
     * List of product attribute summary DTOs for the paginated page result.
     *
     * Each entry summarizes one logical attribute definition (e.g., color,
     * size, or material) for the target product in the shopping mall. These
     * summaries are used by management UIs, REST APIs, and variant picker
     * workflows to enumerate and display all configurable options per
     * product.
     */
    data: IShoppingMallProductAttribute.ISummary[];
  };
}
