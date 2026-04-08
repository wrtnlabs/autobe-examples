import { IEcommerceMallWishlistItem } from "./IEcommerceMallWishlistItem";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallWishlistItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IEcommerceMallWishlistItem.ISummary.
     */
    data: IEcommerceMallWishlistItem.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IInvert = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IEcommerceMallWishlistItem.IInvert.
     */
    data: IEcommerceMallWishlistItem.IInvert[];
  };
}
