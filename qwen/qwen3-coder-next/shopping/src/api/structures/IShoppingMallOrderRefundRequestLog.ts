import { tags } from "typia";

import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallOrderRefundRequestLog {
  /**
   * Summary of refund request status change log entry including status transition details and participant information.
   */
  export type ISummary = {
    /**
     * Unique identifier for the status change log entry
     *
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;

    /**
     * New status value after the change (pending/approved/rejected)
     *
     * @x-autobe-database-schema-property new_status
     */
    new_status: "pending" | "approved" | "rejected";

    /**
     * Previous status value before the change (pending/approved/rejected)
     *
     * @x-autobe-database-schema-property old_status
     */
    old_status: "pending" | "approved" | "rejected";

    /**
     * Customer-provided reason for the status change
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from shopping_mall_order_refund_request_logs.reason.
     */
    reason: string | null;

    /**
     * Seller-provided rejection reason when status changes to rejected
     *
     * @x-autobe-database-schema-property rejection_reason
     * @x-autobe-specification Direct mapping from shopping_mall_order_refund_request_logs.rejection_reason.
     */
    rejection_reason: string | null;

    /**
     * Timestamp when this status change occurred
     *
     * @x-autobe-database-schema-property changed_at
     */
    changed_at: string & tags.Format<"date-time">;

    /**
     * Seller who processed this status change, null for customer-initiated changes
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification Join from shopping_mall_order_refund_request_logs.seller_id to shopping_mall_sellers.id. Returns ISummary.
     */
    seller: IShoppingMallSeller.ISummary | null;
  };
}
