export namespace IPageICommunityPlatformCommunity {
  /**
   * A page of community summary objects. This represents a paginated response
   * containing a collection of ICommunityPlatformCommunity.ISummary objects
   * along with pagination metadata.
   *
   * This schema is designed to be used with the PATCH
   * /communityPlatform/communities endpoint to return filtered and paginated
   * results.
   *
   * The response includes both the list of community summaries and the
   * necessary pagination information to navigate between pages.
   *
   * ## Structure
   *
   * - `items`: Array of ICommunityPlatformCommunity.ISummary objects
   * - `total`: Total number of communities matching the search criteria
   * - `page`: Current page number (1-based)
   * - `limit`: Number of items per page
   * - `total_pages`: Total number of pages available based on total items and
   *   limit
   * - `has_more`: Boolean indicating if there are more pages beyond the current
   *   one
   *
   * Typical usage:
   *
   * ```json
   * {
   *   "items": [
   *     {"id": "...", "name": "tech", "display_name": "Technology", "is_nsfw": false, ...},
   *     {"id": "...", "name": "gaming", "display_name": "Gaming", "is_nsfw": true, ...}
   *   ],
   *   "total": 42,
   *   "page": 1,
   *   "limit": 20,
   *   "total_pages": 3,
   *   "has_more": true
   * }
   * ```
   *
   * This design follows the standard pagination pattern used across the
   * platform and ensures consistent UX for navigating community listings.
   */
  export type ISummary = string;
}
