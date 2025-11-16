import { IPage } from "./IPage";
import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IPageIShoppingMallSeller {
  /**
   * Paginated collection of seller account summaries for administrative list
   * displays.
   *
   * This pagination wrapper encapsulates a page of seller records from the
   * shopping_mall_sellers table along with navigation metadata. It implements
   * the standard pagination pattern used throughout the shopping mall
   * marketplace API for efficiently browsing large datasets.
   *
   * Used in seller search and listing operations where administrators need to
   * browse, filter, and manage seller accounts. The pagination metadata
   * enables client applications to render page controls, display total
   * counts, and navigate between pages of results.
   *
   * Each page contains an array of IShoppingMallSeller.ISummary records
   * providing essential seller information optimized for list views. The
   * wrapper structure separates presentation data (seller summaries) from
   * navigation data (pagination metadata) following clean API design
   * principles.
   *
   * Supports administrative workflows including seller approval queues,
   * seller account searches, status-based filtering, and seller performance
   * monitoring where administrators need efficient access to seller
   * information without loading complete seller profiles.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Contains metadata about the current page of seller results including
     * page number, page size limit, total record count, and total page
     * count. Used by client applications to render pagination controls and
     * navigate through large seller datasets efficiently.
     */
    pagination: IPage.IPagination;

    /**
     * List of seller summary records.
     *
     * Array of lightweight seller representations optimized for list
     * displays in administrative dashboards. Each summary contains
     * essential seller identification, store name, email, and approval
     * status without full business details to minimize payload size for
     * efficient rendering.
     */
    data: IShoppingMallSeller.ISummary[];
  };
}
