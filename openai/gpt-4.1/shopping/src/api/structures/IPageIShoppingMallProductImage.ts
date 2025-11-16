import { IPage } from "./IPage";
import { IShoppingMallProductImage } from "./IShoppingMallProductImage";

export namespace IPageIShoppingMallProductImage {
  /**
   * Paginated result set container for image/media assets associated with
   * shopping mall products or SKUs.
   *
   * Designed for usage with endpoints like patch
   * /shoppingMall/products/{productId}/images, providing clients with a
   * scalable, consistent format for receiving batches of image summaries,
   * along with pagination metadata. Enables frontend and integration
   * developers to implement efficient, user-friendly digital asset browsers.
   *
   * The envelope includes 'pagination' for navigation state and 'data' as an
   * array of per-image summary records, supporting robust asset management,
   * moderation, or visual merchandising workflows inside the shopping mall
   * platform or partner integrations.
   */
  export type ISummary = {
    /**
     * Page metadata object for managing paginated search results in API
     * endpoints.
     *
     * Contains total image count, current and total pages, result window
     * size, and other pagination controls, following the IPage.IPagination
     * type schema. Vital for building digital asset browsers, product image
     * galleries, or media management tools with scalable navigation and
     * optimized API payloads.
     */
    pagination: IPage.IPagination;

    /**
     * List of summary objects for product or SKU images/media files
     * retrieved from page endpoints.
     *
     * Each item is a minimal summary object following
     * IShoppingMallProductImage.ISummary. Used to generate browser/gallery
     * UIs, selection components, or asset-management dashboards for catalog
     * product images or variant-level images; helps clients render a
     * digital gallery with essential metadata for user-facing and
     * admin/inventory functions.
     */
    data: IShoppingMallProductImage.ISummary[];
  };
}
