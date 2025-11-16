import { IPage } from "./IPage";
import { IShoppingMallProductAttributeValue } from "./IShoppingMallProductAttributeValue";

export namespace IPageIShoppingMallProductAttributeValue {
  /**
   * Paginated collection of product attribute value mappings for a specific
   * SKU or variant.
   *
   * This schema represents a single paging result for the values assigned to
   * product attributes within a given SKU. Returned by endpoints like PATCH
   * /shoppingMall/seller/skus/{skuId}/attributeValues and
   * /shoppingMall/admin/skus/{skuId}/attributeValues, it enables efficient
   * management, display, and editing of the option values (e.g., 'Red', 'XL')
   * assigned to each product variant.
   *
   * 'pagination' supports standard navigation and list controls; the 'data'
   * array lists all product attribute value summaries for the page. These
   * records support UI filtering, catalog completeness verification, and
   * robust variant management.
   */
  export type ISummary = {
    /**
     * Standard page navigation and total listing details for product
     * attribute values.
     *
     * Provides current, total, and paging controls to efficiently navigate
     * attribute values (variant option values) assigned under a SKU. Used
     * in search/list results for editing and display in both admin and
     * seller workflows.
     */
    pagination: IPage.IPagination;

    /**
     * List of attribute value summary DTOs pertaining to a single product
     * SKU on the current page.
     *
     * Each entry reflects a mapping of a value (such as 'Red', 'Large') for
     * a particular attribute and SKU. These are referenced by catalog admin
     * UIs, variant editors, and batch workflows for SKU completeness.
     */
    data: IShoppingMallProductAttributeValue.ISummary[];
  };
}
