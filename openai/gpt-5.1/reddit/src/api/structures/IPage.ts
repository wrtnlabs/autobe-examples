import { tags } from "typia";

export namespace IPage {
  /**
   * Standard pagination metadata shared across list responses in the service.
   *
   * This object describes the current position within a paginated result set,
   * the effective page size, and the overall size of the dataset that matched
   * the query. It is typically paired with an array of entity summaries and
   * is designed to be reused across many different list endpoints so that
   * client applications can implement a consistent pagination UX regardless
   * of the underlying entity type.
   */
  export type IPagination = {
    /**
     * Current page index within the result set.
     *
     * This value is conceptually 1‑based for normal client usage, meaning
     * `1` represents the first page, `2` the second page, and so on. When
     * the client requests a page beyond the total number of pages, the
     * server may either clamp this value to the last available page or
     * return an empty result set while still reporting the requested page
     * index.
     *
     * The value is always non‑negative. A value of `0` is reserved for edge
     * cases or internal use and should not be used as a regular page number
     * in client code.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records that can appear in a single page of
     * results.
     *
     * This field represents the effective page size that the server applied
     * when constructing the current response. It typically reflects the
     * client‑requested limit from the corresponding request DTO (for
     * example, `IPage.IRequest.limit`) or a server‑side default when the
     * client did not specify a value.
     *
     * The value is always non‑negative. In typical production
     * configurations this will be strictly positive (for example, 10, 20,
     * 50, or 100). The concrete default and maximum bounds are defined by
     * service configuration and may vary by endpoint.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records in the full result set before pagination is
     * applied.
     *
     * This count reflects how many rows match the current filter and search
     * criteria across the entire dataset in the backing store. It is
     * independent of the current page and is useful for building UI
     * elements such as total counters, progress indicators, and page jump
     * lists.
     *
     * When no records match the query, this value is `0`, and the `pages`
     * field will also be `0` even though `current` and `limit` remain
     * populated.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of pages available for the current query.
     *
     * This value is derived from `records` and `limit` using a ceiling
     * division: `pages = ceil(records / limit)` when `limit` is greater
     * than zero. When either `records` is `0` or `limit` is not a positive
     * value, this field is reported as `0`, indicating that there are no
     * logical pages to navigate.
     *
     * Clients should treat this field as the upper bound for valid page
     * indices and use it to drive pagination controls such as "next",
     * "previous", and "last" page navigation.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
