import { ICrIPageIntegerRequired } from "./ICrIPageIntegerRequired";

export namespace IPage {
  /**
   * Structured page information with proper interface naming.
   *
   * Represents comprehensive pagination metadata returned by the
   * Economic/Political Discussion Board platform. This object contains all
   * necessary information for clients to implement seamless pagination
   * experiences.
   *
   * The pagination structure provides complete context about the current
   * result set, including position within the overall dataset, page
   * boundaries, and total scope. This enables sophisticated pagination
   * interfaces while maintaining efficient API performance for the economic
   * discussion board system.
   */
  export type IPagination = {
    /**
     * Current page number.
     *
     * Represents the current page being requested in paginated responses.
     * This value must be a non-negative integer starting from 0 for the
     * first page.
     *
     * This property enables clients to specify which page of results they
     * want to retrieve from the economic discussion board API.
     */
    current: ICrIPageIntegerRequired;

    /**
     * Total pages.
     *
     * Represents the total number of pages available based on the total
     * record count and the page size limit. Calculated as the ceiling of
     * total records divided by the current limit per page.
     *
     * This computed value is returned by the economic discussion board API
     * to help clients understand the full pagination scope of their
     * request.
     */
    pages: ICrIPageIntegerRequired;

    /**
     * Limitation of records per a page.
     *
     * Defines the maximum number of records to be returned in a single
     * paginated response. This value determines how many economic
     * discussion board entities (such as articles, comments, or members)
     * will be included in each page of results.
     *
     * The limit helps optimize API performance and manage client-side
     * memory usage when dealing with large datasets.
     */
    limit: ICrIPageIntegerRequired;

    /**
     * Total records in the database.
     *
     * Represents the complete count of all matching records in the economic
     * discussion board database system, regardless of pagination settings.
     *
     * This total count enables clients to calculate pagination math and
     * understand the full scope of available data in the economic
     * discussion platform.
     */
    records: ICrIPageIntegerRequired;
  };
}
