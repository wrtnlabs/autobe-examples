import { IPage } from "./IPage";
import { ICommunityPlatformAppeal } from "./ICommunityPlatformAppeal";

export namespace IPageICommunityPlatformAppeal {
  /**
   * Paginated wrapper for appeal summary records retrieved from the
   * `community_platform_appeals` table.
   *
   * This DTO combines generic pagination information with a collection of
   * `ICommunityPlatformAppeal.ISummary` entries so that moderation consoles
   * and administrative dashboards can efficiently browse large sets of
   * appeals. It is used exclusively for read-only list and search operations,
   * where query criteria are provided via `ICommunityPlatformAppeal.IRequest`
   * and the backend translates those criteria into filters over the
   * `community_platform_appeals` Prisma model.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this appeal list page.
     *
     * This field follows the `IPage.IPagination` contract and exposes
     * values such as the current page index, maximum items per page, total
     * record count, and total page count. When listing appeals from
     * `community_platform_appeals`, these values reflect the server-side
     * query window applied to the underlying Prisma model, allowing
     * moderation consoles and admin dashboards to render accurate paging
     * controls and summaries.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of appeal summary records returned for the current
     * page.
     *
     * Each item in this array is an `ICommunityPlatformAppeal.ISummary` DTO
     * derived from a row in the `community_platform_appeals` Prisma model,
     * enriched with the minimal actor, sanction, and routing context needed
     * for list screens. The sequence of items respects the sort criteria
     * provided in the corresponding request DTO (for example creation time,
     * status, or resolution time) and is intended for use in moderation
     * list views, report detail sidebars, or other read-only review
     * workflows.
     */
    data: ICommunityPlatformAppeal.ISummary[];
  };
}
