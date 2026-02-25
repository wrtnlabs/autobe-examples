import { tags } from "typia";

export namespace IShoppingMallCancellationRequestSnapshot {
  /**
   * Immutable snapshot record capturing the state and context of a cancellation request at the moment of status change. Used for audit, compliance, and dispute resolution. Each record includes the original cancellation reason, the response decision and reasoning (if provided), the actor who made the change, and exact timestamp. This record is permanently preserved and cannot be modified.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property reason
     */
    reason: string;
    /**
     * @x-autobe-database-schema-property status
     */
    status: "pending" | "approved" | "rejected";

    /**
     * Unique identifier of the seller or admin who responded to the cancellation request. Null if status is 'pending'.
     *
     * @x-autobe-database-schema-property responder_id
     * @x-autobe-specification Database column is nullable: NULL when no response has been made. This is a foreign key to shopping_mall_users.id.
     */
    responder_id: (string & tags.Format<"uuid">) | null;

    /**
     * Explanation provided by the responder when approving or rejecting the cancellation request. Null if status is 'pending'.
     *
     * @x-autobe-database-schema-property response_reason
     * @x-autobe-specification Database column is nullable: NULL when status is 'pending'. Populated with reason when status is 'approved' or 'rejected'.
     */
    response_reason: string | null;
    /**
     * @x-autobe-database-schema-property changed_at
     */
    changed_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property changed_by
     */
    changed_by: "customer" | "seller" | "admin";
    /**
     * @x-autobe-database-schema-property cancellation_request_id
     */
    cancellation_request_id: string & tags.Format<"uuid">;
  };
}
