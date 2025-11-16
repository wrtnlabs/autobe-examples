import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata structure returned with paginated API responses.
   *
   * This schema defines the standard pagination information object that
   * accompanies paginated list responses across all API endpoints. It
   * provides clients with essential metadata needed to navigate through large
   * result sets efficiently.
   *
   * The pagination object enables clients to understand their current
   * position in the result set, calculate total pages, render pagination UI
   * components, and construct requests for subsequent or previous pages. All
   * numeric values use zero-based or one-based indexing consistently
   * throughout the API.
   *
   * This structure is typically embedded within response objects under a
   * 'pagination' or 'data' wrapper, alongside the actual array of result
   * items.
   */
  export type IPagination = {
    /**
     * Current page number in the paginated result set.
     *
     * Represents the zero-based or one-based index of the current page
     * being returned in the response. This value indicates which page of
     * results the client is currently viewing.
     *
     * This field is used by clients to track their position in the
     * paginated data set and to construct subsequent page requests. The
     * value should match the page number requested by the client in their
     * original query.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records returned per page.
     *
     * Defines the page size limit that was applied when retrieving this
     * paginated result set. This value determines how many records are
     * included in a single page response.
     *
     * Clients use this value in combination with the current page number to
     * calculate offset positions and to understand how results are chunked.
     * The actual number of records in the response may be less than this
     * limit on the final page.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records available in the database matching the query
     * criteria.
     *
     * Represents the complete count of all records that satisfy the search
     * or filter conditions, regardless of pagination. This is the total
     * across all pages, not just the current page.
     *
     * Clients use this value to calculate total page counts, display result
     * statistics to users, and determine whether additional pages exist.
     * This value remains constant across all pages of the same query unless
     * the underlying data changes.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of pages available for the current query.
     *
     * Calculated by dividing the total records by the page limit and
     * applying ceiling rounding: Math.ceil(records / limit). This
     * represents how many pages are required to display all matching
     * records.
     *
     * Clients use this value to render pagination controls, determine if
     * next/previous page buttons should be enabled, and validate page
     * number inputs. A value of 0 indicates no results were found.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
