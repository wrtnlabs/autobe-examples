import { tags } from "typia";

export namespace IPage {
  /**
   * Pagination metadata describing how a complete result set is partitioned
   * into pages.
   *
   * This DTO is used in list and search responses to provide clients with
   * enough information to navigate through large datasets. It reports both
   * the effective paging parameters (`current` and `limit`) and the overall
   * dataset size (`records` and derived `pages`).
   *
   * The values in this object are typically derived from the underlying
   * storage layer (for example, a Prisma query with `take`/`skip` and a
   * separate `count`), and they are always consistent with the filters and
   * access‑control rules applied to the current request.
   */
  export type IPagination = {
    /**
     * Current page index in the paginated result set.
     *
     * This value represents the page that the backend actually resolved and
     * returned in the response. It is expressed as a zero‑based
     * non‑negative integer (0 for the first page, 1 for the second, and so
     * on).
     *
     * In typical usage, this corresponds to the `page` value requested by
     * the client (from `IPage.IRequest.page`), but may be adjusted by the
     * server if the requested page is out of range (for example, requesting
     * a page beyond the last page may be clamped to the last available
     * page).
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records that can appear in a single page of
     * results.
     *
     * This value is the effective page size used when computing the current
     * result window. It is always a non‑negative integer and is typically
     * derived from the client's requested `limit` value, subject to
     * service‑side defaults and maximum caps.
     *
     * When `limit` is 0, the system should be interpreted as returning no
     * records per page while still reporting pagination metadata, although
     * most production usages will enforce a positive minimum such as 10 or
     * 20 items per page.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records that match the applied query conditions
     * before pagination.
     *
     * This count is calculated **after** all filters, search terms, and
     * access‑control rules are applied, but **before** any paging window is
     * sliced out. As a result, `records` tells consumers the full size of
     * the filtered dataset, not just the number of items in the current
     * page.
     *
     * The value is always a non‑negative integer. A value of `0` means that
     * there are no records matching the query, in which case the `pages`
     * value also reflects that there are no available pages.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of pages available for the current query, derived from
     * `records` and `limit`.
     *
     * This value is computed using a ceiling division of `records / limit`
     * when `limit` is greater than zero. For example, with `records = 23`
     * and `limit = 10`, the `pages` value becomes `3`.
     *
     * When `records` is `0`, `pages` is reported as `0` to indicate that
     * the result set is empty. When `limit` is `0`, the service should
     * define a consistent behavior (for example, reporting `pages` as `0`
     * and leaving `current` at `0`), and this DTO simply exposes the chosen
     * behavior without redefining it.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
