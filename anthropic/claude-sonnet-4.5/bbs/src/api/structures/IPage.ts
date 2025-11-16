import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata structure for paginated API responses.
   *
   * Provides complete information about the pagination state of a data
   * collection, including the current page position, page size configuration,
   * total record count, and total page count. This structure is embedded in
   * paginated response bodies to enable clients to implement pagination
   * controls and understand the full dataset scope.
   *
   * The pagination metadata allows clients to calculate navigation targets
   * (first page, last page, next page, previous page) and display
   * user-friendly pagination information such as "Showing 11-20 of 47
   * results" or "Page 2 of 5".
   *
   * All numeric values use integer types with non-negative constraints to
   * ensure valid pagination states. The relationship between these properties
   * is mathematically consistent, with pages being derived from records and
   * limit.
   */
  export type IPagination = {
    /**
     * Current page number in the pagination sequence.
     *
     * Represents the zero-based or one-based index of the current page
     * being returned in the response, depending on the API's pagination
     * convention. This value indicates which page of results the client is
     * currently viewing.
     *
     * Validation constraints ensure this value cannot be negative. When
     * combined with the limit property, clients can calculate the offset
     * for data retrieval (offset = current * limit for zero-based
     * indexing).
     *
     * Clients use this value to track their position in paginated result
     * sets and to construct navigation controls for moving between pages.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records returned per page.
     *
     * Defines the page size constraint that determines how many records are
     * included in a single page of results. This value represents the upper
     * boundary for the number of items in the data array of the paginated
     * response.
     *
     * The limit controls the balance between response payload size and the
     * number of requests needed to retrieve all data. Smaller limits reduce
     * response size and improve initial load times, while larger limits
     * reduce the total number of requests needed.
     *
     * Typical limit values range from 10 to 100 depending on the resource
     * type and client requirements. Server-side maximum limits may apply to
     * prevent excessive resource consumption.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records available in the complete dataset.
     *
     * Represents the absolute count of all records that match the query
     * criteria across all pages, not just the current page. This value is
     * determined by executing a COUNT query against the database with the
     * same filtering conditions applied to the data query.
     *
     * Clients use this value to calculate the total number of pages
     * available, display total result counts in user interfaces, and
     * determine whether additional pages exist beyond the current page.
     *
     * When no records match the query criteria, this value will be 0, and
     * the pages property will also be 0, indicating an empty result set.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of pages in the complete paginated dataset.
     *
     * Calculated as the ceiling of records divided by limit: pages =
     * ceil(records / limit). This represents the total number of pages
     * required to display all available records given the current page
     * size.
     *
     * The ceiling operation ensures that any remainder records are
     * accounted for in an additional page. For example, with 25 records and
     * a limit of 10, pages would be 3 (10 + 10 + 5).
     *
     * When records is 0, pages will also be 0. When limit is 0, special
     * handling may be required to avoid division by zero, typically
     * resulting in pages being 0 or 1 depending on implementation.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
