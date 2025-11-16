import { tags } from "typia";

export namespace ICommunityPlatformDiscoveryFeedOnboarding {
  /**
   * Request payload for fetching the onboarding discovery feed for the
   * community platform.
   *
   * This DTO encapsulates pagination parameters and optional client hints
   * used to tailor the onboarding discovery experience. It is specifically
   * designed for the `PATCH /communityPlatform/discovery/feeds/onboarding`
   * endpoint, which returns a ranked, paginated list of discovery items based
   * on the `community_platform_discovery_items` table.
   *
   * Clients use this request type to control page size and offset or cursor
   * semantics, and to provide contextual information such as locale or
   * platform that may influence ranking or selection logic. The request
   * itself does not perform any mutation and has no side effects; it only
   * shapes how eligible discovery items are selected and ordered for
   * onboarding flows.
   */
  export type IRequest = {
    /**
     * Page index for pagination when using page-based navigation.
     *
     * This value is typically 1-based, where `1` represents the first page
     * of onboarding discovery items. Backend implementations may enforce
     * minimum bounds and treat values lower than the minimum as the first
     * page.
     *
     * When both page-based pagination and cursor-based pagination are
     * supported, page should not be provided together with cursor-related
     * fields to avoid ambiguity.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of onboarding discovery items to return in a single
     * page.
     *
     * This value is used by the backend to cap the number of
     * `ICommunityPlatformDiscoveryItem.ISummary` records returned in the
     * response. Implementations may apply an upper bound to prevent
     * excessively large pages and may fall back to a default when the value
     * is missing or invalid.
     *
     * Typical values range from small page sizes optimized for mobile
     * carousels to moderate sizes suitable for scrollable lists.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Cursor-based pagination token wrapper for the onboarding discovery
     * feed.
     *
     * This property allows clients to request continuation of a previously
     * retrieved discovery page by using an opaque token instead of
     * page-based indices. When present and non-null, it should be treated
     * as the primary pagination mechanism, avoiding simultaneous use of
     * page-based parameters.
     */
    cursor?: string | null | undefined;

    /**
     * Locale hint controlling language and regional adaptation of
     * onboarding discovery content.
     *
     * This field enables clients to explicitly signal the user's preferred
     * locale so that discovery results can be filtered or ranked
     * accordingly, improving relevance and user experience for first-time
     * visitors.
     */
    locale?: string | null | undefined;

    /**
     * Client platform hint for tailoring onboarding discovery logic.
     *
     * By indicating whether the request originates from web, mobile, or
     * other supported platforms, this field allows the backend to apply
     * platform-specific selection or ranking strategies while keeping the
     * API contract stable.
     */
    platform?: string | null | undefined;
  };
}
