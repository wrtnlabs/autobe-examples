import { IPage } from "./IPage";
import { IShoppingMallShippingPartner } from "./IShoppingMallShippingPartner";

export namespace IPageIShoppingMallShippingPartner {
  /**
   * A paged result collection specific to lists of registered
   * shipping/logistics partners in the platform registry.
   *
   * This schema is tailored for the admin-facing registry/search and
   * management grid. It encapsulates summary information for each logistics
   * partner, together with standardized pagination metadata to support UI
   * navigation, bulk processing, and compliance reviews.
   *
   * Each entry in "data" maps to a shipping partner summary record as defined
   * by IShoppingMallShippingPartner.ISummary, providing identification,
   * display, audit, and operational state for external integration and
   * fulfillment workflows.
   */
  export type ISummary = {
    /**
     * Page information, including current page, page size, total records,
     * and total pages. Used for driving result navigation in admin and
     * business-facing shipping partner interfaces.
     */
    pagination: IPage.IPagination;

    /**
     * A list of shipping/logistics partner summary objects for each
     * registry entry matching the search/filter parameters. Each element is
     * a concise view of a registered platform logistics provider as defined
     * by the underlying shopping_mall_shipping_partners model.
     */
    data: IShoppingMallShippingPartner.ISummary[];
  };
}
