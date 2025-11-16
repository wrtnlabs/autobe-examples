import { tags } from "typia";

export namespace IPage {
  /**
   * Represents page metadata for paginated API results.
   *
   * Provided in API responses where collections are returned. Encapsulates
   * context for pagination, including the currently viewed page, the per-page
   * limit, total result count, and pages available. Clients should use this
   * structure to implement pagination controls and provide user feedback
   * regarding list navigation.
   */
  export type IPagination = {
    /**
     * Current page number within the paginated result set.
     *
     * This field is used by clients to identify which page they are
     * currently viewing or have requested. The first page typically starts
     * at 1. If the result set is empty, this value may default to 0.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records returned per page.
     *
     * This value defines the size of each page of results. Clients can use
     * this to control how many items they receive at once from the backend.
     * Typical default and maximum values may be determined by system
     * settings or business rules.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records matching the query criteria in the data set.
     *
     * This value allows the client application to understand the overall
     * result set size, enabling the implementation of page navigation and
     * end‐of‐list detection.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of available result pages given the current query and
     * pagination limit.
     *
     * This value is computed as the ceiling of records divided by limit.
     * For example, if 55 records and limit of 20, pages equals 3.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
