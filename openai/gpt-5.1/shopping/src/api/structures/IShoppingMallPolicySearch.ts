import { tags } from "typia";

export namespace IShoppingMallPolicySearch {
  /**
   * Advanced search filters, pagination, and sorting options for querying
   * policy-related configuration records in the shoppingMall platform.
   *
   * This DTO is used by platform administrators to search across multiple
   * policy tables, including mall-wide policy settings, cancellation
   * policies, refund policies, review policies, and age restriction policies.
   * It allows combining multiple optional filters with pagination and sorting
   * parameters in a single structured request body.
   */
  export type IRequest = {
    /**
     * 1-based page index for paginated search results.
     *
     * Defaults to 1 when omitted. Used together with `limit` to control
     * which slice of the full result set is returned.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of records to return per page.
     *
     * Defaults to a sensible platform-wide value when omitted (for example
     * 20 or 50). Implementations should enforce an upper bound to prevent
     * excessive result sizes.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Optional list of policy type codes to restrict the search to one or
     * more policy categories.
     *
     * Typical values may include codes representing mall policy settings,
     * cancellation policies, refund policies, review policies, and age
     * restriction policies. When omitted or empty, all policy types are
     * eligible.
     */
    policy_types?: string[] | undefined;

    /**
     * Optional list of status codes used to filter policies by their
     * lifecycle state.
     *
     * Common examples include active, draft, deprecated, or archived
     * statuses. When omitted, policies of all statuses are considered.
     */
    statuses?: string[] | undefined;

    /**
     * Lower bound of the effective date range filter.
     *
     * When provided, only policies whose effective date is on or after this
     * timestamp are included in the search results. Uses ISO 8601 date-time
     * format in UTC.
     */
    effective_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Upper bound of the effective date range filter.
     *
     * When provided, only policies whose effective date is on or before
     * this timestamp are included in the search results. Uses ISO 8601
     * date-time format in UTC.
     */
    effective_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional list of region or market codes used to filter policies by
     * their applicability.
     *
     * For example, this may correspond to country codes, regional
     * groupings, or internal market identifiers managed by the platform.
     */
    region_codes?: string[] | undefined;

    /**
     * Free-text search term used to match against policy names, titles, or
     * descriptive content.
     *
     * Supports case-insensitive partial matching and may be implemented
     * using full-text search capabilities depending on the underlying
     * database.
     */
    search?: (string & tags.MinLength<1>) | undefined;

    /**
     * Field name used to sort the aggregated policy search results.
     *
     * Typical options include fields such as `updatedAt`, `effectiveFrom`,
     * or `priority`. If omitted, a default sort order (for example, by last
     * updated time descending) is applied.
     */
    sort_by?: string | undefined;

    /**
     * Sort direction for the search results.
     *
     * Uses `asc` for ascending order and `desc` for descending order. When
     * omitted, the platform applies its default direction, commonly
     * `desc`.
     */
    sort_direction?: "asc" | "desc" | undefined;
  };
}
