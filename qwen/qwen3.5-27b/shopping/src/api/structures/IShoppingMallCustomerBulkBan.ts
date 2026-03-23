import { tags } from "typia";

export namespace IShoppingMallCustomerBulkBan {
  /**
   * Request body for bulk banning multiple customer accounts. This administrative operation allows platform administrators to ban multiple customers simultaneously for policy violations or abuse. The customerIds array specifies which customers to ban, and the reason field documents the justification for the ban action for audit purposes.
   */
  export type ICreate = {
    /**
     * Array of unique customer identifiers to ban. Each ID must be a valid UUID of an existing customer account.
     *
     * @x-autobe-specification Array of customer UUIDs extracted from request body. Each UUID is validated against shopping_mall_customers table. Must contain at least one unique customer ID. Backend checks existence and current status (active vs already banned) for each ID.
     */
    customerIds: (string & tags.Format<"uuid">)[] &
      tags.MinItems<1> &
      tags.UniqueItems;

    /**
     * Administrative justification for the ban action. This reason is logged for audit purposes and may be used to notify customers if they are unbanned later.
     *
     * @x-autobe-specification Ban justification text from request body. Stored in audit logs with admin ID, timestamp, and affected customer IDs. Minimum 1 character required. Used for administrative record-keeping and potential customer notification if unbanned.
     */
    reason: string & tags.MinLength<1>;
  };

  /**
   * Response body for bulk customer ban operation. Contains summary counts of successful bans, failures, and skipped customers, along with detailed results for each customer including their ID, operation status, and error messages if applicable.
   */
  export type IResult = {
    /**
     * Number of customer accounts that were successfully banned in this bulk operation.
     *
     * @x-autobe-specification Computed count of customers successfully banned during this bulk operation. Incremented for each customer where status was changed from 'active' to 'banned' in shopping_mall_customers table.
     */
    successCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of customer accounts that failed to ban due to errors in this bulk operation.
     *
     * @x-autobe-specification Computed count of customers that failed to ban due to errors. Incremented for each customer where an error occurred (e.g., customer not found, database error, permission denied).
     */
    failureCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of customer accounts that were already banned and skipped in this bulk operation.
     *
     * @x-autobe-specification Computed count of customers that were already banned and thus skipped. Incremented for each customer whose status was already 'banned' before this operation.
     */
    skippedCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Detailed results for each customer in the bulk ban operation, showing individual outcomes and error messages.
     *
     * @x-autobe-specification Array of IResultItem objects, one per customer ID from the request, maintaining the same order as input. Each item contains customerId (UUID), status (success/failed/skipped), and errorMessage (string, populated only when status is 'failed').
     */
    results: IShoppingMallCustomerBulkBan.IResultItem[];
  };

  /**
   * Individual result item for a bulk customer ban operation. Contains the customer identifier, operation status (success, failed, or skipped), and an optional error message when the operation failed for that specific customer.
   */
  export type IResultItem = {
    /**
     * The unique identifier of the customer that was processed in this bulk ban operation.
     *
     * @x-autobe-specification UUID from request input array, maintains same order as input. Not from database - this is the customer ID that was attempted to be banned in the bulk operation.
     */
    customerId: string & tags.Format<"uuid">;

    /**
     * The outcome of the ban operation for this customer. 'success' means the customer was banned, 'failed' means an error occurred, 'skipped' means the customer was already banned.
     *
     * @x-autobe-specification One of three values: 'success' (customer was banned), 'failed' (error occurred during ban operation), or 'skipped' (customer was already banned before this operation). Determined by the outcome of the ban attempt.
     */
    status: "success" | "failed" | "skipped";

    /**
     * Error message explaining why the ban failed. Only populated when status is 'failed'. Null or omitted for success and skipped statuses.
     *
     * @x-autobe-specification String populated only when status is 'failed'. Contains error description explaining why the ban failed (e.g., 'customer not found', 'permission denied', 'invalid customer ID'). Null or omitted for success and skipped statuses.
     */
    errorMessage: string | null;
  };
}
