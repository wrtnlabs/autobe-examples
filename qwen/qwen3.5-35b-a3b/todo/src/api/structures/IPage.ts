import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata containing current page position and total data
   * statistics.
   *
   * This interface provides comprehensive pagination information returned
   * alongside paginated list data. It enables clients to implement navigation
   * controls, display progress indicators, and determine data boundaries for UI
   * rendering.
   */
  export type IPagination = {
    /**
     * Current page number being viewed (1-indexed).
     *
     * Indicates which page of results is currently being returned. Page
     * numbering starts from 1, so the first page is page 1 (not 0). This value
     * reflects the page parameter from the request after validation and bounds
     * checking.
     *
     * @x-autobe-specification 1-indexed current page number. Defaults to 1.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records per page.
     *
     * Defines the upper bound on how many records can be returned in a single
     * page. This corresponds to the limit parameter from the request. The
     * actual number of records in the data array may be less than this value on
     * the final page or when total records are fewer than the limit.
     *
     * @x-autobe-specification Maximum records per page. Actual count may be less on last page.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total count of all records matching the query criteria.
     *
     * Represents the complete number of records available across all pages, not
     * just the current page. This value is computed via a COUNT query and is
     * essential for calculating total pages and displaying pagination UI
     * elements like "Showing 1-10 of 150 results".
     *
     * @x-autobe-specification Total record count across all pages.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of pages available.
     *
     * Calculated as ceiling of {@link records} divided by {@link limit}. When
     * records is 0, pages will also be 0. This value enables clients to render
     * page navigation controls and validate page bounds.
     *
     * @x-autobe-specification Total pages. Calculated as Math.ceil(records / limit).
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
