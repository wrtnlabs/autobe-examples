import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata for paginated API responses.
   *
   * Provides comprehensive information about the current page position, page
   * size, total available records, and total pages in a paginated result set.
   * This metadata enables clients to render pagination controls, navigate
   * between pages, and display result counts to users.
   *
   * Included in all paginated response wrappers (IPage<T>) alongside the
   * actual data array. The pagination values reflect the query state at
   * request time and are calculated based on the applied filters, search
   * terms, and sorting parameters.
   */
  export type IPagination = {
    /**
     * Current page number in the paginated result set.
     *
     * Represents the zero-based index of the current page being returned.
     * For example, if current is 0, this is the first page of results. If
     * current is 2, this is the third page.
     *
     * This value is used by clients to understand their current position in
     * the overall result set and to construct navigation requests for
     * previous/next pages. It should always be less than the total pages
     * value.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records returned per page.
     *
     * Defines the page size used for this paginated response. The actual
     * number of records in the data array may be less than this limit on
     * the final page or when filtered results are fewer than the limit.
     *
     * This value helps clients understand how many records to expect per
     * page and is used in pagination calculations. Typical values range
     * from 10 to 100 depending on the resource type and performance
     * considerations.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records available in the complete result set.
     *
     * Represents the total count of all records matching the current query
     * filters across all pages, not just the records in the current page
     * response. This count reflects the database state at query time and
     * may change between requests if data is modified.
     *
     * Clients use this value to calculate total pages, display result
     * counts to users, and determine if there are more pages available.
     * When combined with limit, it determines the pages value.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of pages in the complete paginated result set.
     *
     * Calculated as ceiling(records / limit), representing how many pages
     * are required to display all available records with the current page
     * size. For example, if there are 25 records and limit is 10, pages
     * will be 3.
     *
     * Clients use this value to render pagination controls, validate page
     * navigation boundaries, and determine if current page is the last
     * page. When records is 0, pages will also be 0. When records is less
     * than or equal to limit, pages will be 1.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
