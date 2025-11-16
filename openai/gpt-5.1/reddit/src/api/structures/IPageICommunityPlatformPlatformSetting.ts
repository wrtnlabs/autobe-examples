import { IPage } from "./IPage";
import { ICommunityPlatformPlatformSetting } from "./ICommunityPlatformPlatformSetting";

export namespace IPageICommunityPlatformPlatformSetting {
  /**
   * Paginated collection of platform-wide configuration settings summaries.
   *
   * This DTO wraps a page of `ICommunityPlatformPlatformSetting.ISummary`
   * records, which themselves map to rows in the
   * `community_platform_platform_settings` Prisma model. It is the standard
   * response shape for list and search operations over platform settings,
   * such as the `/communityPlatform/platformAdmin/platformSettings` endpoint
   * used by platform administrators.
   *
   * The `pagination` property provides page-level metadata (current page,
   * page size, total records, and total pages), while the `data` array
   * contains the actual summary entries for each configuration setting in the
   * current slice of the result set.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current page of platform settings.
     *
     * This property follows the `IPage.IPagination` schema, exposing fields
     * such as `current` (1-based current page index), `limit` (maximum
     * number of rows per page), `records` (total number of matching
     * settings in the `community_platform_platform_settings` table), and
     * `pages` (total number of pages based on `records` and `limit`).
     *
     * In the context of
     * `/communityPlatform/platformAdmin/platformSettings`, it describes how
     * the list of `ICommunityPlatformPlatformSetting.ISummary` records has
     * been sliced when platform administrators search or filter
     * platform-wide configuration settings.
     */
    pagination: IPage.IPagination;

    /**
     * List of platform settings summary records in the current page.
     *
     * Each element is an `ICommunityPlatformPlatformSetting.ISummary`
     * object that corresponds directly to a row in the
     * `community_platform_platform_settings` Prisma model. These summaries
     * expose the key business-identifying fields for each configuration
     * entry (such as `id`, `key`, `value`, `is_active`, `created_at`, and
     * `updated_at`) in a compact form suitable for administrative list or
     * table views.
     *
     * This array is populated by search operations like `PATCH
     * /communityPlatform/platformAdmin/platformSettings`, and is typically
     * used together with the `pagination` block to render paginated lists
     * where operators can quickly scan and drill down into individual
     * platform settings.
     */
    data: ICommunityPlatformPlatformSetting.ISummary[];
  };
}
