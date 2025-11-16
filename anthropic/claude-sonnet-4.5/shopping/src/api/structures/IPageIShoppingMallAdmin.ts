import { IPage } from "./IPage";
import { IShoppingMallAdmin } from "./IShoppingMallAdmin";

export namespace IPageIShoppingMallAdmin {
  /**
   * Paginated response wrapper for administrator account search and list
   * operations.
   *
   * This response type encapsulates filtered and sorted administrator account
   * results from the shopping_mall_admins Prisma schema table, providing both
   * the matching admin records and pagination metadata for efficient
   * navigation through potentially large result sets. Used as the response
   * body for admin search operations that support comprehensive filtering by
   * email, admin_level, account status, and creation date ranges.
   *
   * The pagination structure follows the standard IPage pattern used
   * throughout the platform, ensuring consistent pagination behavior across
   * all list operations. This enables administrative dashboards to implement
   * uniform pagination controls and navigation experiences regardless of the
   * entity type being browsed.
   *
   * This paginated response supports administrative oversight workflows
   * including admin account auditing, privilege level management, and user
   * access governance. Administrators can efficiently browse through the
   * complete admin user base using pagination controls while applying filters
   * to narrow results based on specific criteria such as privilege levels
   * (super_admin, moderator, support), verification status, or account
   * creation timeframes.
   *
   * Security and authorization context: Access to this paginated admin list
   * is restricted to authenticated administrators with appropriate
   * permissions. The response may filter or limit data visibility based on
   * the requesting admin's privilege level to maintain proper access control
   * and information security.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through the administrator list.
     *
     * Provides essential pagination information including current page
     * number, total pages available, total record count across all pages,
     * and the page size limit. This metadata enables clients to implement
     * efficient pagination controls, calculate remaining pages, and
     * navigate through potentially large administrator datasets without
     * loading all records simultaneously.
     *
     * The pagination object helps administrative dashboards display page
     * navigation UI elements and inform users about the total scope of
     * administrator accounts matching their search criteria.
     */
    pagination: IPage.IPagination;

    /**
     * Array of administrator account summaries matching the search and
     * filter criteria.
     *
     * Contains the actual admin records for the current page, with each
     * element providing summary information from the shopping_mall_admins
     * Prisma schema. The array size is controlled by the pagination limit
     * parameter and may contain fewer items on the last page.
     *
     * Each admin summary includes essential identification fields (id,
     * email, full_name), privilege level (admin_level), verification status
     * (email_verified), and account lifecycle timestamps (created_at,
     * updated_at, deleted_at). This summary data is optimized for
     * displaying administrator lists in administrative oversight dashboards
     * and user management interfaces.
     */
    data: IShoppingMallAdmin.ISummary[];
  };
}
