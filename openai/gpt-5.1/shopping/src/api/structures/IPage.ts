import { tags } from "typia";

export namespace IPage {
  /**
   * Standard pagination metadata describing how a result set has been sliced
   * into pages.
   *
   * This DTO is returned alongside list or search responses to give clients
   * enough information to render pagination controls and understand how many
   * items are available in total.
   *
   * The values in this object always reflect the **effective** pagination
   * after the backend has applied any defaults, caps, and filtering logic.
   * They are consistent with the result set in the associated list payload
   * and are safe to expose directly to API consumers.
   */
  export type IPagination = {
    /**
     * Zero-based index of the current page being returned in this response.
     *
     * This value starts at `0` for the first page by convention in this
     * backend. Clients that prefer one-based page numbering can convert to
     * `current + 1` for display purposes.
     *
     * `current` is always less than or equal to `pages - 1` when there is
     * at least one page of data, and is `0` when there are no records
     * (`records = 0` and `pages = 0`).
     */
    current: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Maximum number of records that the server attempts to return in a
     * single page of results.
     *
     * This value is derived from the incoming pagination request (for
     * example, `IPage.IRequest.limit`) but may be capped by a platform-wide
     * maximum to protect performance. When the client does not explicitly
     * specify a limit, this field reflects the default page size chosen by
     * the backend.
     *
     * `limit` is used together with `current` to calculate which slice of
     * the filtered dataset is included in the response.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of records in the result set after all filters, search
     * conditions, and access-control constraints have been applied.
     *
     * This is **not** necessarily the raw count of rows in the underlying
     * database table. Instead, it represents the total number of items that
     * would be returned across all pages for the current query parameters
     * (e.g., search keywords, filter fields, actor-scoped restrictions).
     *
     * Clients can combine `records` with `limit` to derive additional UI
     * metrics, such as whether there is any data to show or how many items
     * are left beyond the current page.
     */
    records: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of pages available for the current query given the
     * `records` count and the applied `limit`.
     *
     * The value is calculated as the mathematical ceiling of `records /
     * max(limit, 1)`. When `records` is `0`, this field is `0`, indicating
     * that there are no pages of data.
     *
     * `pages` can be used together with `current` to determine whether
     * there is a previous or next page, and to render pagination controls
     * in client applications.
     */
    pages: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
