import { IPage } from "./IPage";
import { ICommunityPlatformCommunityVisibilityLevel } from "./ICommunityPlatformCommunityVisibilityLevel";

export namespace IPageICommunityPlatformCommunityVisibilityLevel {
  /**
   * Paginated result set of community visibility level master records used by
   * the community platform.
   *
   * This type wraps a page of
   * `ICommunityPlatformCommunityVisibilityLevel.ISummary` objects derived
   * from the `community_platform_community_visibility_levels` Prisma model,
   * which stores configuration for how communities are exposed for discovery
   * and access (for example, public, restricted, or private). It is the
   * standard response envelope for list/search operations that browse
   * visibility configuration, such as administrative tools that manage which
   * visibility options are available to community creators.
   *
   * The `pagination` property provides normalized paging metadata using the
   * `IPage.IPagination` contract, indicating which slice of the full
   * visibility level dataset is being returned and how many records exist in
   * total. The `data` property contains the actual summary records for the
   * current page, each of which can be rendered directly in configuration
   * grids or selection dialogs without requiring an additional detail fetch
   * for common use cases.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of community
     * visibility level records returned from the underlying data store.
     *
     * This property follows the `IPage.IPagination` schema, which
     * encapsulates the current page index, maximum number of items per
     * page, total number of records, and total number of pages derived from
     * those counts. Clients use this information when building paginated
     * list UIs to drive next/previous navigation, disable pagination
     * controls when the end of the result set is reached, and to present
     * overall result counts to operators working with visibility level
     * master data.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of community visibility level summary records for
     * the current page of results.
     *
     * Each element in this array is an
     * `ICommunityPlatformCommunityVisibilityLevel.ISummary` DTO that
     * corresponds to a single row from the
     * `community_platform_community_visibility_levels` Prisma model,
     * projected into a lightweight view suitable for listing screens. The
     * summaries typically include stable business identifiers such as the
     * visibility level code, human‑readable labels, and key behavioral
     * flags that control how communities can be discovered and joined.
     *
     * Together with the `pagination` property, this array forms a complete
     * page of visibility level master data as returned by search endpoints
     * like `PATCH /communityPlatform/memberUser/communityVisibilityLevels`,
     * after applying any filter, sort, and paging criteria specified in the
     * associated request DTO.
     */
    data: ICommunityPlatformCommunityVisibilityLevel.ISummary[];
  };
}
