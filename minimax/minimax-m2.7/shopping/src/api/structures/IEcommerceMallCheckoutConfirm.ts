import { tags } from "typia";

export namespace IEcommerceMallCheckoutConfirm {
  /**
   * Request body for confirming checkout and placing an order after successful payment processing. Contains optional shipping address selection and payment token from external gateway. If address_id is not provided, the customer's default shipping address is used automatically.
   */
  export type IRequest = {
    /**
     * Payment token from external payment gateway for transaction verification. This token confirms successful payment processing before order creation.
     *
     * @x-autobe-specification External payment gateway token. Not stored in database - validated against payment gateway API to confirm successful payment before order creation. Server-side verification only, token is consumed/exchanged during confirmation process.
     */
    payment_token: string;

    /**
     * Optional UUID of the shipping address to use for this order. If not provided, the customer's default shipping address is automatically selected.
     *
     * @x-autobe-specification Optional shipping address selection. Maps to ecommerce_mall_shipping_addresses.id via belongs-to relationship. When null, query customer's default address (is_default=true, deleted_at=null). Belongs-to customer via ecommerce_mall_customer_id resolved from JWT session context.
     */
    address_id?: (string & tags.Format<"uuid">) | undefined;

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
