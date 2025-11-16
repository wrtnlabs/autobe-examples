import { IPage } from "./IPage";
import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";

export namespace IPageICommunityPlatformCommunity {
  /**
   * Paginated collection of community summaries.
   *
   * This schema models a single page of communities returned by discovery and
   * search endpoints such as `/communityPlatform/communities` and
   * `/communityPlatform/communities/search`. It reflects queries over the
   * `community_platform_communities` table and related models, where clients
   * filter and sort communities by name, visibility, tags, creation dates,
   * and membership metrics.
   *
   * The `pagination` field describes the overall paging context (current
   * page, limit, total records, and total pages) so that clients can
   * implement navigation controls or infinite scroll. The `data` array
   * contains the `ICommunityPlatformCommunity.ISummary` items for the current
   * page, providing enough information to render community lists, search
   * results, and administrative overviews without incurring the cost of
   * loading full community configuration for each entry.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * This object captures the pagination state for the current community
     * list response, including the current page index, maximum number of
     * items per page, total number of communities matching the applied
     * filters, and the number of pages required to represent the full
     * result set. It is used to drive discovery or administration UIs that
     * browse communities in a paginated fashion.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each entry is an `ICommunityPlatformCommunity.ISummary` DTO that
     * summarizes a single community row from the
     * `community_platform_communities` Prisma model, optionally enriched
     * with related visibility level and tagging information. These
     * summaries are optimized for list and search result views, exposing
     * identifiers, names, slugs, visibility information, and basic
     * presentation attributes without the full configuration or rule sets.
     */
    data: ICommunityPlatformCommunity.ISummary[];
  };
}
