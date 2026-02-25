import { tags } from "typia";

import { IShoppingMallCustomer } from "./IShoppingMallCustomer";

export namespace IShoppingMallOrderStatusLog {
  /**
   * Lightweight summary of order status change history for display in lists.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property previous_status
     */
    previous_status: string;
    /**
     * @x-autobe-database-schema-property new_status
     */
    new_status: string;
    /**
     * @x-autobe-database-schema-property reason
     */
    reason: string;

    /**
     * Customer who triggered the status change (or null for system-generated changes)
     *
     * @x-autobe-database-schema-property changedBy
     * @x-autobe-specification LEFT JOIN to shopping_mall_customers table to include customer summary for audit trail. The changedBy relation is nullable to support system-generated status changes.
     */
    changed_by: IShoppingMallCustomer.ISummary | null;
  };
}
