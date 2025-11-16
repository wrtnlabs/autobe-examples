import { IPage } from "./IPage";
import { IShoppingMallAdminRole } from "./IShoppingMallAdminRole";

export namespace IPageIShoppingMallAdminRole {
  /**
   * Paginated collection of platform administrator role summaries from the
   * `shopping_mall_admin_roles` catalog.
   *
   * This wrapper serves as the response envelope for the PATCH search
   * endpoint at `/shoppingMall/platformAdmin/adminRoles`. It combines generic
   * paging information from `IPage.IPagination` with a page of
   * `IShoppingMallAdminRole.ISummary` items so that platform administrators
   * can browse, filter, and audit the set of configured admin roles in a
   * consistent, list‑oriented format.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of administrator
     * role definitions.
     *
     * It contains standard paging fields such as the current page index,
     * page size, total number of role records, and total number of pages,
     * allowing admin consoles to render stable, navigable role lists backed
     * by the `shopping_mall_admin_roles` table.
     */
    pagination: IPage.IPagination;

    /**
     * List of administrator role summary records for the current page.
     *
     * Each element is an `IShoppingMallAdminRole.ISummary` DTO that
     * represents a single role defined in the `shopping_mall_admin_roles`
     * Prisma model, including identifiers, human‑readable names, and
     * high‑level characteristics such as system role flags. The collection
     * reflects the filters, sort order, and pagination settings supplied
     * via `IShoppingMallAdminRole.IRequest`.
     */
    data: IShoppingMallAdminRole.ISummary[];
  };
}
