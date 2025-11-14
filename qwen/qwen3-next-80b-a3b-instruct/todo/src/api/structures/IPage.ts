import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata response object. Contains complete information about
   * the current pagination state including the current page number, records
   * per page, total records in the dataset, and total pages available. This
   * structure is used in all paginated responses across the system to provide
   * consistent pagination information to clients. It enables efficient
   * navigation through large result sets by providing all necessary metadata
   * for pagination controls.
   */
  export type IPagination = {
    /**
     * Current page number in the pagination sequence. Must be 0 or greater.
     * Typically used by clients to navigate through paginated results.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of records returned per page. Must be 0 or greater. Specifies
     * the size of each pagination window. Values of 0 may indicate no limit
     * or default limit based on system configuration.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records available in the database for this query.
     * Used to calculate total pages and inform users of result set size.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of pages available based on the total records and limit
     * value. Calculated as ceiling(records / limit). This helps clients
     * understand the full scope of available data and navigate between
     * pages.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
