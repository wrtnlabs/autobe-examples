import { tags } from "typia";

export namespace IEcommerceMall {
  /**
   * Base pagination interface for ecommerce mall domain entities. Serves as a generic marker type for items in paginated list responses.
   */
  export type IPagination = {
    /**
     * Unique identifier for the entity.
     *
     * @x-autobe-specification Generic unique identifier placeholder. Actual entity types extend this interface and map to their specific primary key column (e.g., ecommerce_mall_customers.id, ecommerce_mall_products.id). This property serves as a consistent identifier field in paginated list responses.
     */
    id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Timestamp when the entity was created.
     *
     * @x-autobe-specification Generic creation timestamp placeholder. Actual entity types extend this interface and map to their specific created_at column (e.g., ecommerce_mall_customers.created_at, ecommerce_mall_products.created_at). This property serves as a consistent timestamp field in paginated list responses.
     */
    created_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
