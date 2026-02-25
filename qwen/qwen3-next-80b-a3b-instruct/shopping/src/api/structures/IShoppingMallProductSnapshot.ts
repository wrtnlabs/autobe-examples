import { tags } from "typia";

export namespace IShoppingMallProductSnapshot {
  /**
   * A compact representation of a user identity for audit trails and snapshot history, exposing only the unique identifier and account status. Used internally to identify the actor who made a change without exposing private information like email, password, or timestamps. The display_name is included for human-readable context but is computed from external profile data.
   */
  export type ISummary = {
    /**
     * Unique identifier for the user account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_users.id. Unique UUID identifier for the user.
     */
    id: string & tags.Format<"uuid">;

    /**
     * User-friendly name or shop name for display in audit trails and activity logs. This value is resolved by joining with the actor's specific profile table.
     *
     * @x-autobe-specification Computed property: Derived from the extended profile table (shopping_mall_customers.display_name, shopping_mall_sellers.shop_name, or shopping_mall_admins.display_name) via join with shopping_mall_users. Not stored in shopping_mall_users table.
     */
    display_name?: string | undefined;

    /**
     * Current status of the user account: active, suspended, or deleted.
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from shopping_mall_users.status. Encodes account state: 'active', 'suspended', or 'deleted'. Derived from combined logic of is_active and user_type.
     */
    status: "active" | "suspended" | "deleted";
  };

  /**
   * A compact summary of a product snapshot showing its metadata state at the time of edit. Includes version number, product name, description, base price, category reference, timestamp of change, and actor ID. Used for audit trail listings in admin interfaces. Ensures historical accuracy for dispute resolution by preserving exact state at time of modification.
   */
  export type IS = {
    /**
     * Sequential version number of this snapshot, incrementing with each product edit.
     *
     * @x-autobe-database-schema-property version
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.version. Incremented on every product edit.
     */
    version: number & tags.Type<"int32">;

    /**
     * The product name as it existed at the time of this snapshot.
     *
     * @x-autobe-specification Join from shopping_mall_product_snapshots.product_id to shopping_mall_products.id to retrieve product.name as it existed at the time of snapshot.
     */
    name: string;

    /**
     * The product description as it existed at the time of this snapshot.
     *
     * @x-autobe-specification Join from shopping_mall_product_snapshots.product_id to shopping_mall_products.id to retrieve product.description as it existed at the time of snapshot.
     */
    description: string;

    /**
     * The base price of the product as it existed at the time of this snapshot.
     *
     * @x-autobe-specification Join from shopping_mall_product_snapshots.product_id to shopping_mall_products.id to retrieve product.base_price as it existed at the time of snapshot.
     */
    base_price: number;

    /**
     * The UUID identifier of the category the product belonged to at the time of this snapshot.
     *
     * @x-autobe-database-schema-property category_id
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.category_id. References the category at time of snapshot.
     */
    category_id: string & tags.Format<"uuid">;

    /**
     * The exact timestamp when this snapshot was created, capturing the moment of the product edit.
     *
     * @x-autobe-database-schema-property changed_at
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.changed_at. Immutable timestamp of the edit event.
     */
    changed_at: string & tags.Format<"date-time">;

    /**
     * The UUID identifier of the actor (seller or admin) who made the edit that triggered this snapshot.
     *
     * @x-autobe-database-schema-property changed_by_id
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.changed_by_id. ID of the actor who made the edit (seller or admin).
     */
    changed_by_id: string & tags.Format<"uuid">;
  };

  /**
   * Request parameters for querying historical snapshots from multiple immutable entity types on the shoppingMall platform. This enables customers, sellers, and administrators to search and filter audit trails for product edits, variant changes, order items, reviews, cancellations, and refunds with granular control over entity type, actor, date range, and request status. The snapshot data is preserved indefinitely for compliance and dispute resolution.
   */
  export type IRequest = {
    /**
     * The type of immutable snapshot to query. Must be exactly one of: product, variant, order_item, review, cancellation_request, or refund_request.
     *
     * @x-autobe-specification Filter by type of entity snapshot to query: 'product', 'variant', 'order_item', 'review', 'cancellation_request', or 'refund_request'. Used in WHERE clause on the 'type' column of the six snapshot tables in a UNION query.
     */
    entity_type:
      | "product"
      | "variant"
      | "order_item"
      | "review"
      | "cancellation_request"
      | "refund_request";

    /**
     * The actor who performed the change that created the snapshot. Filter by: 'customer', 'seller', or 'admin'. If omitted, returns snapshots from all actor types.
     *
     * @x-autobe-specification Optional filter by the actor type who made the change: 'customer', 'seller', or 'admin'. Applied to the 'changed_by_id' field in snapshot tables joined with shopping_mall_users to determine actor role.
     */
    changed_by?: "customer" | "seller" | "admin" | undefined;

    /**
     * The earliest date (inclusive) to include snapshots from, in ISO 8601 format (YYYY-MM-DD). If omitted, no lower bound is applied.
     *
     * @x-autobe-specification Optional filter for minimum changed_at timestamp. Accepts ISO 8601 date string (YYYY-MM-DD). Applied to the 'changed_at' field in all six snapshot tables as changed_at >= from_date.
     */
    from_date?: (string & tags.Format<"date">) | undefined;

    /**
     * The latest date (inclusive) to include snapshots from, in ISO 8601 format (YYYY-MM-DD). If omitted, no upper bound is applied.
     *
     * @x-autobe-specification Optional filter for maximum changed_at timestamp. Accepts ISO 8601 date string (YYYY-MM-DD). Applied to the 'changed_at' field in all six snapshot tables as changed_at <= to_date.
     */
    to_date?: (string & tags.Format<"date">) | undefined;

    /**
     * The status of the request for cancellation or refund snapshots: 'pending', 'approved', or 'rejected'. Only applies to cancellation_request and refund_request entity types. Has no effect on other entity types.
     *
     * @x-autobe-specification Optional filter for request status: 'pending', 'approved', or 'rejected'. Only relevant for cancellation_request and refund_request snapshot types. Applied to the 'status' field in the appropriate snapshot tables.
     */
    status?: "pending" | "approved" | "rejected" | undefined;

    /**
     * The page number of results to return, starting from 1. When null or omitted, defaults to page 1. Requesting a page beyond available range returns empty data with valid pagination metadata.
     *
     * @x-autobe-specification 1-indexed page number for paginated results. Defaults to 1 if null or omitted. The server enforces upper bounds to prevent resource exhaustion. Used for cursor-based pagination in the result set.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page. Defaults to 100 if null or undefined. The server may enforce upper bounds to prevent excessive resource consumption on large requests.
     *
     * @x-autobe-specification Maximum number of records to return per page. Defaults to 100 if null or omitted. The server may enforce upper bounds for performance. Used for cursor-based pagination.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * A compact summary of a product snapshot for display in audit lists. Contains immutable metadata about the change event and minimal product state (id, name, base_price, category_id) to enable quick identification without loading full snapshot data. Used in paginated audit dashboards for efficiency across billions of records.
   */
  export type ISum = {
    /**
     * Discriminator field indicating this is a product snapshot type. Always 'product'.
     *
     * @x-autobe-specification Computed constant value 'product' from snapshot type in UNION query.
     */
    type: "product";

    /**
     * The exact timestamp when this product snapshot was created, capturing the moment of change.
     *
     * @x-autobe-specification Extracted from changed_at column in shopping_mall_product_snapshots table via SQL query.
     */
    changed_at: string & tags.Format<"date-time">;

    /**
     * The actor type who made the change: 'customer', 'seller', or 'admin'.
     *
     * @x-autobe-specification Determined from user_type in shopping_mall_users table joined with changed_by_id in product_snapshots. Value mapped to: 'customer', 'seller', or 'admin'.
     */
    changed_by: "customer" | "seller" | "admin";

    /**
     * Sequential version number of this snapshot, starting at 1 for the first edit.
     *
     * @x-autobe-specification Derived from version integer column in shopping_mall_product_snapshots table, incremented on each edit.
     */
    version: number & tags.Type<"int32">;

    /**
     * Immutable minimal product state at time of change: contains id, name, base_price, and category_id of the product as it existed during the edit.
     *
     * @x-autobe-specification Constructed from SELECT id, name, base_price, category_id FROM shopping_mall_product_snapshots WHERE version = current. All values are immutable snapshots as of the change event.
     */
    snapshot_data: {
      id: string & tags.Format<"uuid">;
      name: string;
      base_price: number;
      category_id: string & tags.Format<"uuid">;
    };
  };
}
