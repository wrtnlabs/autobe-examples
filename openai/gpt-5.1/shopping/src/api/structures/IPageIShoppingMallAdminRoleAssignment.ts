import { IPage } from "./IPage";
import { IShoppingMallAdminRoleAssignment } from "./IShoppingMallAdminRoleAssignment";

export namespace IPageIShoppingMallAdminRoleAssignment {
  /**
   * Paginated list of platform administrator role assignment summaries.
   *
   * This schema wraps a page of `IShoppingMallAdminRoleAssignment.ISummary`
   * records that originate from the `shopping_mall_admin_role_assignments`
   * Prisma table. It is typically used by back‑office tools to show which
   * admin roles are currently or historically assigned to a specific platform
   * administrator, along with pagination metadata for navigating large result
   * sets.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current page of admin role assignment
     * summaries.
     *
     * This object describes which slice of the overall result set is being
     * returned, including the current page number, page size, total record
     * count, and total page count. It is derived from the query that reads
     * `shopping_mall_admin_role_assignments` for a given platform
     * administrator and is used by clients to drive list navigation UI such
     * as next/previous buttons.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of admin role assignment summary records for the requested
     * page.
     *
     * Each element is an `IShoppingMallAdminRoleAssignment.ISummary` object
     * representing a single row from the
     * `shopping_mall_admin_role_assignments` Prisma model, enriched with
     * lightweight information about the related platform administrator and
     * admin role. Together with the pagination object, this array is used
     * to render tabular views and audit lists of which roles are or were
     * assigned to a given administrator over time.
     */
    data: IShoppingMallAdminRoleAssignment.ISummary[];
  };
}
