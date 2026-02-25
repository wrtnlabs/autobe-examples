import { tags } from "typia";

export namespace IShoppingMallUser {
  /**
   * Search and pagination parameters for filtering and retrieving a paginated list of user accounts in the administrative dashboard. Allows filtering by account status and role, and searching by partial email or display names.
   */
  export type IRequest = {
    /**
     * Filter users by their account status: active, suspended, or deleted.
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Maps to shopping_mall_users.status column. Filters users by account state: 'active', 'suspended', or 'deleted'. When omitted, returns all statuses. Used in SQL WHERE clause: status IN ($1, $2, ...)
     */
    status?: "active" | "suspended" | "deleted" | undefined;

    /**
     * Filter users by their role type: customer, seller, or administrator.
     *
     * @x-autobe-database-schema-property user_type
     * @x-autobe-specification Maps to shopping_mall_users.user_type column. Filters users by actor type: 'customer', 'seller', or 'admin'. When omitted, returns all user types. Used in SQL WHERE clause: user_type IN ($1, $2, ...)
     */
    user_type?: "customer" | "seller" | "admin" | undefined;

    /**
     * Text search across user email, customer display name, or seller shop name. Returns matching users regardless of position of match.
     *
     * @x-autobe-specification Performs case-insensitive partial string match against email, and joined display_name (from shopping_mall_customers) or shop_name (from shopping_mall_sellers). Implements SQL LIKE '%' || $1 || '%' with indexes on email, display_name, shop_name. Returns results where any field contains the search term. Ignored if empty or null.
     */
    search?: string | undefined;

    /**
     * The page number of results to return, starting from 1. Used for pagination navigation.
     *
     * @x-autobe-specification Pagination control: 1-indexed page number to retrieve. Must be integer ≥ 1. Combined with limit to calculate OFFSET for SQL query. Default value is 1. Validated at API gateway level. Triggers LIMIT and OFFSET clauses in query.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of user records to return per page, between 1 and 100. Default is 20.
     *
     * @x-autobe-specification Pagination control: maximum number of records per page. Must be integer between 1 and 100 inclusive. Default value is 20. Used in SQL LIMIT clause. Enforces upper bound for performance and security. Validated at API gateway level.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };
}
