import { tags } from "typia";

export namespace IEcommerceMallSellerSnapshot {
  /**
   * Request parameters for retrieving a paginated list of seller profile snapshots.
   *
   * This DTO defines the filtering and pagination criteria for querying the audit trail of seller profile modifications. Each snapshot captures changes to shop name, shop description, and logo.
   *
   * **Pagination**:
   * - page: The page number to retrieve (1-based, default: 1)
   * - limit: Number of snapshots per page (1-100, default: 20)
   *
   * **Filtering**:
   * - sellerCode: Optional seller identifier. When provided, allows administrators to view snapshots for a specific seller. Regular sellers cannot use this parameter and will always see their own snapshots.
   *
   * **Sorting**:
   * - Snapshots are always sorted by creation timestamp in descending order (newest first). This sorting is enforced by the server and cannot be customized.
   *
   * **Access Control**:
   * - Sellers: Can only view their own profile snapshots
   * - Administrators: Can view any seller's snapshots by specifying the sellerCode parameter
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-based index). Default is 1.
     *
     * @x-autobe-specification Pagination parameter: 1-indexed page number for snapshot listing. Defaults to 1 if not provided. Used to calculate OFFSET in SQL query as (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of snapshots per page. Minimum 1, maximum 100. Default is 20.
     *
     * @x-autobe-specification Pagination parameter: maximum number of snapshots per page. Minimum 1, maximum 100. Defaults to 20 if not provided. Used as LIMIT in SQL query.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Optional seller identifier. When provided, allows administrators to view snapshots for a specific seller. Regular sellers cannot use this parameter.
     *
     * @x-autobe-specification Optional filter parameter for administrator access control. When provided, allows administrators to query snapshots for a specific seller by joining with ecommerce_mall_sellers table on seller code. Regular sellers cannot use this parameter; their authenticated seller ID from JWT is used for data isolation instead.
     */
    sellerCode?: (string & tags.Format<"uuid">) | undefined;
  };

  /**
   * Lightweight summary view of seller profile modification snapshots for audit trail display. Represents a single seller profile change event capturing when the modification occurred, who made the change (administrator name or null for self-edits), and the complete before/after state of the seller profile including shop_name, shop_description, and logo fields. Used in paginated snapshot listings for sellers to track their own profile changes and for administrators to monitor profile modifications across all sellers.
   */
  export type ISummary = {
    /**
     * Unique identifier for the snapshot record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_snapshots.id. Primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the seller profile modification occurred.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_snapshots.created_at. Server-set timestamp at snapshot creation time.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Name of the administrator who made the profile change, or null if the seller updated their own profile.
     *
     * @x-autobe-specification Computed property: admin name from LEFT JOIN with ecommerce_mall_admins when ecommerce_mall_admin_id is present, null when seller updates their own profile. Implementation: SELECT admin.name FROM ecommerce_mall_admins WHERE id = ecommerce_mall_seller_snapshots.ecommerce_mall_admin_id (null if admin_id is null).
     */
    changed_by: string | null;

    /**
     * JSON object containing seller profile values before the modification, including shop_name, shop_description, and logo fields.
     *
     * @x-autobe-database-schema-property previous_values
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_snapshots.previous_values. JSON string containing shop_name, shop_description, and logo fields before the modification.
     */
    previous_values: {
      [key: string]: string;
    };

    /**
     * JSON object containing seller profile values after the modification, including shop_name, shop_description, and logo fields.
     *
     * @x-autobe-database-schema-property current_values
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_snapshots.current_values. JSON string containing shop_name, shop_description, and logo fields after the modification.
     */
    current_values: {
      [key: string]: string;
    };
  };
}
