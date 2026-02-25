import { tags } from "typia";

export namespace IShoppingMallSellerApproval {
  /**
   * Request body for approving a seller registration or administrator request. Contains approval confirmation and optional rejection details.
   */
  export type IApprovalRequest = {
    /**
     * Approval confirmation: 'approved' indicates seller registration approval.
     *
     * @x-autobe-specification Approval confirmation. Set to 'approved' for seller registration approval. This field maps to the status column in shopping_mall_seller_approvals table.
     * @x-autobe-database-schema-property status
     */
    approval_action: string;

    /**
     * Optional rejection reason when denying the seller registration request.
     *
     * @x-autobe-specification Optional rejection reason when denying the seller registration request. This field maps to the rejection_reason column in shopping_mall_seller_approvals table.
     * @x-autobe-database-schema-property rejection_reason
     */
    rejection_reason?: string | null | undefined;
  };

  /**
   * Seller approval approval response containing approval status and timestamps.
   */
  export type IApprovalResponse = {
    /**
     * Unique identifier for the approval record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_seller_approvals.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Current approval status: pending, approved, or rejected.
     *
     * @x-autobe-database-schema-property status
     * @x-autobe-specification Direct mapping from shopping_mall_seller_approvals.status (mapped as approval_status).
     */
    approval_status: string;

    /**
     * The UUID of the seller account being approved.
     *
     * @x-autobe-database-schema-property shopping_mall_seller_id
     * @x-autobe-specification Direct mapping from shopping_mall_seller_approvals.shopping_mall_seller_id.
     */
    shopping_mall_seller_id: string & tags.Format<"uuid">;

    /**
     * Reason provided when the approval is rejected. Null when approval is approved or pending.
     *
     * @x-autobe-specification Direct mapping from shopping_mall_seller_approvals.rejection_reason (nullable).
     * @x-autobe-database-schema-property rejection_reason
     */
    rejection_reason?: string | null | undefined;

    /**
     * Timestamp when the approval was processed by the administrator.
     *
     * @x-autobe-specification Direct mapping from shopping_mall_seller_approvals.processed_at (nullable).
     * @x-autobe-database-schema-property processed_at
     */
    processed_at?: string | null | undefined;

    /**
     * The shop name of the approved seller.
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification Join from shopping_mall_seller_approvals.shopping_mall_seller_id to shopping_mall_sellers.id to retrieve shop_name.
     */
    shop_name: string;

    /**
     * Timestamp when the seller was approved by an administrator.
     *
     * @x-autobe-specification Computed field: Approval date is set when approval_status changes to 'approved'. Maps to approval_date in the approval record.
     */
    approval_date: string & tags.Format<"date-time">;
  };
}
