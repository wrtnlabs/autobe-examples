import { tags } from "typia";

export namespace IPage {
  /**
   * Standard pagination metadata describing the position of the current page
   * within a larger result set.
   *
   * This schema is designed to be embedded alongside list responses returned
   * from paginated endpoints. It provides enough information for API
   * consumers to understand how many records match the query, how many pages
   * of data are available, and which page of results is currently being
   * viewed.
   *
   * The values exposed here are derived from the client-supplied pagination
   * query parameters in `IPage.IRequest` combined with system-level defaults
   * and limits. As a result, clients should treat this object as the single
   * source of truth for pagination state, even if the original request
   * provided different raw values.
   */
  export type IPagination = {
    /**
     * Zero-based index of the current page in a paginated result set.
     *
     * This value corresponds to the `page` parameter received in
     * `IPage.IRequest` after the service has applied any defaulting or
     * boundary clamping rules. Implementations typically treat `0` as the
     * first page, but may allow clients to send `null` or omit `page` in
     * the request, in which case the service resolves a concrete `current`
     * value here.
     *
     * When combined with the `limit` property, this value can be used by
     * clients to calculate offset-based positions or to render pagination
     * UI components such as "Previous" and "Next" buttons.
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records returned in a single page of results.
     *
     * This value reflects the effective page size chosen for the response.
     * It is derived from the `limit` parameter of `IPage.IRequest`, but may
     * be clamped by system-wide configuration (for example, enforcing an
     * upper bound to protect performance).
     *
     * Clients should use this value, rather than their original request,
     * when computing navigation or estimating total pages, because the
     * server may adjust excessively large or invalid `limit` inputs to a
     * safe default.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records in the full result set before pagination is
     * applied.
     *
     * This count represents how many rows match the applied filters and
     * search criteria in the underlying data store, regardless of the
     * current page or page size. When `records` is `0`, it indicates that
     * no data matched the query, and services typically return an empty
     * list for the associated items.
     *
     * Clients can use this value together with `limit` to estimate overall
     * dataset size and to render UI elements like "X items found"
     * indicators.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of available pages for the current query, derived from
     * the total `records` and the `limit` (page size).
     *
     * The value is generally computed as the mathematical ceiling of
     * `records / limit`. When `records` is `0`, implementations typically
     * set `pages` to `0` while also setting `current` to `0` and returning
     * an empty items array.
     *
     * Consumers should rely on this property, rather than re-computing it,
     * to determine whether a requested page index is within range and to
     * decide if there are more pages available for navigation.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
