import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata providing information about the current page position
   * and total result set size.
   *
   * This structure is included in all paginated API responses to help clients
   * navigate through large result sets. It contains four key metrics: the
   * current page number, the page size limit, the total number of matching
   * records, and the total number of pages available.
   *
   * Clients use this metadata to implement pagination controls (previous/next
   * buttons, page number selectors), display result counts to users, and
   * validate navigation requests. The combination of these four values
   * provides complete information needed to navigate any paginated result
   * set.
   */
  export type IPagination = {
    /**
     * Current page number in the paginated result set.
     *
     * This represents which page of results is currently being returned,
     * using 1-based indexing where the first page is numbered 1. The value
     * must be between 1 and the total number of pages (inclusive).
     *
     * Clients use this value to understand their current position in the
     * result set and to construct navigation to previous/next pages. When
     * current equals 1, there are no previous pages. When current equals
     * pages, there are no next pages.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records returned per page.
     *
     * This defines the page size - how many individual records are included
     * in each page of results. The actual number of records in the current
     * page may be less than this limit on the final page of results.
     *
     * This value controls the density of API responses and affects both
     * performance and user experience. Common values range from 10 to 100
     * depending on the resource type and use case.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records matching the query criteria.
     *
     * This represents the complete count of records that match the current
     * filter/search parameters, not just the records returned in the
     * current page. This is the filtered subset of the database, not
     * necessarily all records in the table.
     *
     * Clients use this value to display total result counts to users and to
     * calculate pagination controls. When combined with limit, it
     * determines the total number of pages needed to display all matching
     * results.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of pages in the paginated result set.
     *
     * This is calculated by dividing the total records by the limit (page
     * size) and rounding up to the nearest integer (ceiling operation). For
     * example, with 25 records and a limit of 10, pages would be 3 (pages 1
     * and 2 contain 10 records each, page 3 contains 5 records).
     *
     * When there are no matching records, this value is 0. When there are
     * records, this value is always at least 1. Clients use this to render
     * pagination controls and to validate that requested page numbers are
     * within valid bounds.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
