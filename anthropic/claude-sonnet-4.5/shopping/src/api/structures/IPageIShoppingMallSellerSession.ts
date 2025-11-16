import { IPage } from "./IPage";
import { IShoppingMallSellerSession } from "./IShoppingMallSellerSession";

export namespace IPageIShoppingMallSellerSession {
  /**
   * Paginated collection of seller authentication session summaries for
   * security monitoring and session management.
   *
   * This pagination wrapper encapsulates a page of seller session records
   * from the shopping_mall_seller_sessions table along with navigation
   * metadata. It implements the standard pagination pattern for efficiently
   * browsing authentication histories that may span months or years of login
   * activity.
   *
   * Used in session management dashboards and security monitoring interfaces
   * where sellers review their own authentication activity or administrators
   * investigate security incidents across the platform. The pagination
   * metadata enables navigation through large session histories without
   * loading entire datasets into memory.
   *
   * Each page contains an array of IShoppingMallSellerSession.ISummary
   * records providing essential session information including timestamps, IP
   * addresses, and session status. The wrapper structure separates session
   * data from pagination controls following clean API design principles.
   *
   * Supports security workflows including concurrent session monitoring,
   * suspicious login detection, session termination interfaces, and
   * authentication audit trails where users need efficient access to session
   * history without overwhelming browser performance or network bandwidth.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains metadata about the current page of session results including
     * page number, page size limit, total record count, and total page
     * count. Enables client applications to render pagination controls and
     * navigate through potentially extensive session histories
     * efficiently.
     */
    pagination: IPage.IPagination;

    /**
     * List of seller session summary records.
     *
     * Array of lightweight session representations optimized for session
     * management interfaces and security audit displays. Each summary
     * contains essential session identification, seller reference, IP
     * address, and timestamps without detailed connection context to reduce
     * payload size for efficient list rendering.
     */
    data: IShoppingMallSellerSession.ISummary[];
  };
}
