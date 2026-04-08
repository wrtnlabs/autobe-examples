import { tags } from "typia";

export namespace IEcommerceMallPaymentWebhook {
  /**
   * Payment gateway webhook payload containing transaction details and payment status for order processing.
   */
  export type IRequest = {
    /**
     * Unique transaction identifier assigned by the payment gateway.
     *
     * @x-autobe-specification Direct string value from payment gateway webhook payload (payload.transaction_id). Unique per gateway. Used for idempotency checks to prevent duplicate processing.
     */
    transactionId: string;

    /**
     * Platform order reference number used for order lookup.
     *
     * @x-autobe-specification Platform order reference number (order_number) for looking up the associated order in ecommerce_mall_orders. This is the customer's visible order reference, not the internal UUID id. Used to match webhook to specific order for status update.
     */
    orderReference: string;

    /**
     * Payment status reported by the gateway.
     *
     * @x-autobe-specification Payment outcome status from gateway. Maps to internal order state: success/captured triggers order confirmation, failed/declined triggers payment failure handling, refunded triggers refund workflow and inventory restoration.
     */
    status: "success" | "captured" | "failed" | "declined" | "refunded";

    /**
     * Payment amount in major currency units.
     *
     * @x-autobe-specification Decimal amount in major currency units from gateway. Used for payment verification against order total_amount in ecommerce_mall_orders. Amount may be multiplied by 100 for minor units (cents) internally for precision.
     */
    amount: number;

    /**
     * ISO 4217 currency code of the payment.
     *
     * @x-autobe-specification ISO 4217 currency code (e.g., USD, KRW, JPY). Validated against configured supported currencies in payment config. Must match the currency used when the associated order was created.
     */
    currency: string;

    /**
     * ISO 8601 datetime when the payment event occurred.
     *
     * @x-autobe-specification ISO 8601 datetime string when the payment event occurred at gateway. Used for audit logging and idempotency checks based on event timing. Stored in webhook audit log entries.
     */
    timestamp: string & tags.Format<"date-time">;

    /**
     * Identifier of the payment gateway that sent this webhook.
     *
     * @x-autobe-specification Identifier string of the payment gateway that sent this webhook. Used for routing verification and gateway-specific processing logic. Verified against configured gateway secrets.
     */
    gateway?: string | undefined;

    /**
     * Additional gateway-specific key-value pairs for custom data.
     *
     * @x-autobe-specification Additional gateway-specific data passthrough. Stored in audit log for debugging and dispute resolution. Not used for core payment processing but available for gateway-specific extensions.
     */
    metadata?:
      | {
          [key: string]: string;
        }
      | undefined;

    /**
     * Customer email address for payment notification purposes.
     *
     * @x-autobe-specification Optional customer email from gateway for sending payment notifications. If absent, email is looked up from the associated order's customer record via ecommerce_mall_orders join to ecommerce_mall_customers.
     */
    customerEmail?: (string & tags.Format<"email">) | undefined;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * Specifies which page of results to return. Page numbering starts from 1.
     * If omitted, null, or undefined, defaults to page 1 (first page).
     * Requesting a page beyond the available range returns an empty data array
     * with valid pagination metadata reflecting the actual totals.
     *
     * @x-autobe-specification 1-indexed page number. Defaults to 1 if not provided.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * Controls how many records are included in each page response. If omitted,
     * null, or undefined, defaults to 100 records per page. The server may
     * enforce upper bounds to prevent excessive resource consumption on large
     * requests.
     *
     * @x-autobe-specification Maximum records per page. Defaults to 100 if not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
