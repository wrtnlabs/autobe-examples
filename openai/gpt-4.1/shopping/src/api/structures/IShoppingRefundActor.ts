import { tags } from "typia";

export namespace IShoppingRefundActor {
  /**
   * Minimal identification for the actor (customer, seller, or admin) that
   * initiated a refund request. Does not expose private PII. Used for
   * embedding in refund objects, status transitions, approvals, and admin
   * override entities. For customer, 'name' maps to shopping_customers.name;
   * for seller, 'name' maps to shopping_sellers.display_name; for admin,
   * 'name' maps to shopping_admins.name. Business context and documentation
   * should always use this mapping for clarity.
   */
  export type ISummary = {
    /**
     * Actor type responsible for this refund operation. Accepted values:
     * 'customer' for a platform customer, 'seller' for the merchant, or
     * 'admin' for a system administrator. Must be one of these exact
     * strings.
     */
    actor_type: "customer" | "seller" | "admin";

    /**
     * UUID for the actor. For customer, this is shopping_customers.id; for
     * seller, shopping_sellers.id; for admin, shopping_admins.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Actor's display name. For actor_type 'customer', this value is
     * sourced from shopping_customers.name; for 'seller', this is
     * shopping_sellers.display_name; for 'admin', this is
     * shopping_admins.name. Always ensure downstream business logic and API
     * documentation maps the correct entity field for name based on
     * actor_type, to prevent mislabeling or ambiguity.
     */
    name: string;
  };
}
