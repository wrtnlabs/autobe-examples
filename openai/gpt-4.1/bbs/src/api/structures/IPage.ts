import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata structure included in all paginated service
   * responses.
   *
   * This schema communicates current navigation state and overall dataset
   * boundaries to clients, supporting robust, consistent paging experiences.
   * It enables frontend/UI logic to determine visibility of navigation
   * controls, progress bars, or empty state handling.
   *
   * See the individual field descriptions for guidance on handling edge
   * cases, default value enforcement, and typical value ranges.
   */
  export type IPagination = {
    /**
     * The index number of the page currently being viewed or returned in
     * the paginated dataset.
     *
     * It determines which "window" of records the user or client is
     * requesting from the service. 'current' must be greater than or equal
     * to 0. In typical usage, a value exceeding the total available number
     * of pages (see 'pages' field) will result in either an empty result
     * set or service-side auto-reset to the maximum page index, depending
     * on the implementation. This field is required so that navigation
     * state is never ambiguous in paged responses.
     *
     * Example: If a dataset contains 200 records and 'limit' is 50, 'pages'
     * will be 4. 'current' = 2 would mean records 101-150.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * The maximum number of records to be displayed per page of results.
     *
     * This allows clients or users to control the chunk size of paginated
     * responses, which is crucial for performance and client-side
     * rendering. 'limit' should be bounded by the server (e.g., typical
     * values are 10, 25, 50, 100) to prevent excessively large page
     * requests. Service implementations can enforce upper/lower bounds for
     * this value. Always required for calculating offsets and results
     * windows.
     *
     * Example: Setting 'limit' to 25 means only 25 records will be shown
     * per page.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * The total count of database records that match the query criteria,
     * before pagination is applied.
     *
     * This informs the client/application of the dataset's full cardinality
     * so navigation controls, summaries, and progress indicators can be
     * generated. 'records' must be non-negative and provides context for
     * the entire pagination UI, even when only a subset of results are
     * currently returned.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * The calculated total number of pages based on 'records' and 'limit'.
     *
     * 'pages' is equal to 'records / limit' with ceiling, ensuring that the
     * last page reflects any partial record sets. This is essential for
     * accurate navigation and for validating the 'current' value. If
     * 'records' is 0, 'pages' is still 0 (an empty result set). This field
     * encodes boundary conditions for paging logic and user experience.
     *
     * Example: For 120 records and limit 50, 'pages' will be 3.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
