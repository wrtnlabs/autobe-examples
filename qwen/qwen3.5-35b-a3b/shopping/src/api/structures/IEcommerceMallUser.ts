import { tags } from "typia";

export namespace IEcommerceMallUser {
  /**
   * Search and pagination criteria for listing user accounts across customers, sellers, and administrators.
   *
   * This request DTO provides administrators and super administrators with comprehensive filtering, search, and pagination capabilities for the platform user list operation. It supports querying across all three actor types (customers, sellers, administrators) with unified pagination and sorting.
   */
  export type IRequest = {
    /**
     * Actor type filter to restrict the query to a specific user type.
     *
     * Determines which actor table(s) to query. When provided, filters results to only that actor type. When omitted, performs a UNION query across customers, sellers, and administrators.
     *
         * @x-autobe-specification Discriminator field that filters which actor
         *   table to query: 'customer' for ecommerce_mall_members, 'seller' for
         *   ecommerce_mall_sellers, 'administrator' for
         *   ecommerce_mall_administrators. When omitted, performs UNION query
         *   across all three tables. Used for type-based filtering in
         *   administrative user listings.
     */
    type?: "customer" | "seller" | "administrator" | undefined;

    /**
     * Search query for filtering users by display name using partial match.
     *
     * Applies case-insensitive LIKE search on the display_name field across all actor types. Supports wildcard matching to find users whose display name contains the search term.
     *
         * @x-autobe-specification Text search applied on display_name field
         *   across all actor types. Uses LIKE query with wildcards for partial
         *   matching. Applies to customer display_name, seller display_name,
         *   and administrator display_name fields. Minimum 1 character, maximum
         *   100 characters to prevent excessive search queries.
     */
    query?: (string & tags.MinLength<1> & tags.MaxLength<100>) | undefined;

    /**
     * Account status filter to narrow results by approval, ban, or suspension state.
     *
     * Filters users by their current account state. Status meanings vary by actor type: 'active' means unbanned and approved, 'banned' indicates account restriction, 'suspended' applies to sellers, and 'pending' indicates awaiting approval for sellers.
     *
         * @x-autobe-specification Filters by account status flags: 'active'
         *   (is_banned=false AND is_suspended=false AND
         *   approval_status='approved' for sellers), 'banned' (is_banned=true),
         *   'suspended' (is_suspended=true for sellers), 'pending'
         *   (approval_status='pending' for sellers). Each status value has
         *   actor-type-specific meaning in the union query context.
     */
    status?: "active" | "banned" | "suspended" | "pending" | undefined;

    /**
     * Cursor token for pagination navigation, retrieved from previous response.
     *
     * Used for cursor-based pagination to efficiently retrieve subsequent pages. Must be obtained from the cursor field of a previous paginated response. Enables consistent, performant pagination across large datasets.
     *
         * @x-autobe-specification Cursor-based pagination token for retrieving
         *   the next page of results. Returned in the 'cursor' field of
         *   paginated responses. Implemented using the last sorted value from
         *   the previous page (created_at, updated_at, or display_name
         *   depending on sortBy setting). Allows efficient navigation through
         *   large result sets without offset-based pagination performance
         *   issues.
     */
    cursor?: string | undefined;

    /**
     * Maximum number of results to return per page.
     *
     * Controls how many user records appear in each page response. The server enforces a minimum of 1 and a maximum of 100 records per page to balance usability and performance.
     *
         * @x-autobe-specification Maximum number of results to return per page.
         *   Minimum 1, maximum 100 rows enforced by server. Default is 20 when
         *   not specified. Used to control pagination page size and prevent
         *   excessive data retrieval in single requests.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Field name to sort the results by.
     *
     * Determines which field to use for ordering results. Available options: 'created_at' for account registration date, 'updated_at' for last profile modification, and 'display_name' for alphabetical ordering by user's public name.
     *
         * @x-autobe-specification Field name to sort results by: 'created_at'
         *   (account creation timestamp), 'updated_at' (last modification
         *   timestamp), 'display_name' (public-facing name). All three fields
         *   exist in all three actor tables, making them suitable for the UNION
         *   query. Used with sortOrder to control result ordering.
     */
    sortBy?: "created_at" | "updated_at" | "display_name" | undefined;

    /**
     * Sort order direction: ascending or descending.
     *
     * Determines whether results are ordered from lowest to highest ('asc') or highest to lowest ('desc'). For dates, 'asc' shows oldest first; for text fields, 'asc' shows A-Z ordering.
     *
         * @x-autobe-specification Sort direction: 'asc' for ascending (earliest
         *   first for dates, A-Z for text), 'desc' for descending (latest first
         *   for dates, Z-A for text). Used together with sortBy field to
         *   control the ordering direction of paginated results. Default is
         *   'desc' for most use cases.
     */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * Specifies which page of results to return using traditional page-based pagination. Defaults to page 1 if not provided. When page number exceeds available pages, returns empty data with accurate pagination metadata.
     *
         * @x-autobe-specification 1-indexed page number for traditional
         *   offset-based pagination as an alternative to cursor-based
         *   pagination. Defaults to 1 if not provided, null, or undefined. Used
         *   for simpler pagination scenarios where cursor navigation is not
         *   required. Requesting a page beyond available range returns empty
         *   data array with valid pagination metadata.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Summary record of a user account for administrative listing and platform oversight.
   *
   * This unified object type represents a combined view of customer, seller, and administrator accounts. The `type` field acts as a discriminator to identify the user category.
   *
   * ### Fields
   *
   * - **id**: The unique user identifier (UUID)
   * - **email**: Partially masked email for privacy (e.g., 'j***n@example.com')
   * - **type**: User type discriminator ('customer', 'seller', 'administrator')
   * - **display_name**: Public-facing name (nullable for customers)
   * - **approval_status**: Seller approval state ('pending', 'approved', 'rejected') - only for sellers
   * - **grade**: Administrator grade ('regular', 'super') - only for administrators
   * - **is_banned**: Whether the account is banned (customers, administrators)
   * - **is_suspended**: Whether the seller account is suspended - only for sellers
   * - **created_at**: Account creation timestamp
   * - **updated_at**: Last profile update timestamp
   */
  export type ISummary = {
    id: string & tags.Format<"uuid">;
    email: string;
    type: "customer" | "seller" | "administrator";

    /**
     * Public-facing name displayed in admin dashboards, system logs, and order confirmations.
     *
     * This field varies by actor type: customers have optional display names (nullable), while sellers and administrators always have a display name. When null for a customer, the email address is typically used as the display identifier. Each edit to display names creates an audit snapshot for compliance tracking.
     *
         * @x-autobe-specification Union query result from
         *   ecommerce_mall_members.display_name (nullable),
         *   ecommerce_mall_sellers.display_name (non-null), and
         *   ecommerce_mall_administrators.display_name (non-null). Nullable
         *   because customers allow null display names.
     */
    display_name: string | null;

    /**
     * Seller account approval status in the platform onboarding workflow.
     *
     * This field applies only to seller accounts and indicates whether the seller has been approved to list products and fulfill orders. Customer and administrator accounts always return null. The approval status is managed by administrators during the seller registration process.
     *
         * @x-autobe-specification Seller approval state from
         *   ecommerce_mall_sellers.approval_status. Null for customers and
         *   administrators. Values: 'pending' (awaiting admin review),
         *   'approved' (can sell products), 'rejected' (application denied with
         *   rejection_reason).
     */
    approval_status: string | null;

    /**
     * Administrator grade classification for role-based access control.
     *
     * This field applies only to administrator accounts and determines the scope of administrative privileges. 'Regular' administrators have standard oversight duties, while 'super' administrators have elevated permissions including managing other administrators and promoting/demoting grades. Customer and seller accounts always return null for this field.
     *
         * @x-autobe-specification Administrator grade from
         *   ecommerce_mall_administrators.grade. Null for customers and
         *   sellers. Values: 'regular' (standard admin access), 'super'
         *   (elevated privileges including admin management and grade
         *   promotion/demotion).
     */
    grade: string | null;

    /**
     * Indicates whether the account is currently banned from platform access.
     *
     * This field applies to customers and administrators who use the ban mechanism. Sellers use a separate suspension system (tracked via is_suspended field and seller_suspensions table), so this field is null for seller accounts. When true, the account cannot authenticate or perform any platform actions.
     *
         * @x-autobe-specification Ban status from
         *   ecommerce_mall_members.is_banned or
         *   ecommerce_mall_administrators.is_banned. Null for sellers who use
         *   is_suspended instead. True when account is banned and cannot
         *   authenticate.
     */
    is_banned: boolean | null;

    /**
     * Indicates whether the seller account is currently suspended by administrators.
     *
     * This field applies only to seller accounts. When true, the seller's products are hidden from customer-facing listings and they cannot create or edit products. They may still fulfill existing orders. Customer and administrator accounts always return null for this field.
     *
         * @x-autobe-specification Seller suspension status from
         *   ecommerce_mall_sellers.is_suspended. Null for customers and
         *   administrators. True when seller account is suspended by
         *   administrators.
     */
    is_suspended: boolean | null;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  };
}
