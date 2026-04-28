import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallPayment } from "../../../../structures/IShoppingMallPayment";

/**
 * Initiates a payment attempt for the customer’s checkout flow.
 *
 * This operation represents the platform’s business attempt to transfer money for a customer’s order placement. In this domain, Payment is a distinct event from shipping and fulfillment: the payment outcome determines whether an order is created and proceeds to the fulfillment workflow. The system must track each attempt in the payment table so downstream order creation can be investigated deterministically.
 *
 * When the payment attempt succeeds, the system creates the corresponding order record and order item records. As part of successful order creation, each order item is entered into the paid workflow state (payment completed and waiting for the seller to ship), and the order header reflects the placement timestamp. The system also decrements inventory quantities for each purchased product variant and removes the purchased cart items from the customer cart, ensuring the order reflects the items confirmed during the checkout order-summary review step.
 *
 * When the payment attempt fails, the system must not create any order or order item records for that attempt. This ensures that order history shown to the customer and seller/admin observability remain consistent with the money-exchange rules: only successful payments lead to created orders.
 *
 * Security and authorization: only authenticated members are allowed to initiate payments for their own checkout flow (scope is the currently authenticated customer/member). The operation must ensure the payment attempt is associated with the correct order placement context and must reject any attempt that would charge for another customer’s cart or order placement data.
 *
 * Error handling and consistency: if the provider call fails or returns a failed status, the operation records the failure details (error_code, error_message where available) and returns the payment attempt with status indicating failure, without creating order/order-items. The implementation must use a transaction boundary so partial writes do not leave an order created without corresponding payment success, and so inventory/cart mutations do not happen on failure.
 *
 * @param props.connection
 * @param props.body Request payload to create a new payment attempt for the current checkout/order placement flow. Contains payment amount, currency, and provider reference details required to charge the customer, and any identifiers needed to associate the attempt with the customer’s order placement context.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Validate request body for required fields (amount,
 *   currency, provider, provider_reference, and a customer/order placement
 *   context identifier as defined by IShoppingMallPayment.ICreate). Ensure the
 *   caller is authorized as the owning customer for the referenced
 *   checkout/cart context.
 *
 * 2) Start a database transaction.
 *    - Insert a shopping_mall_payments row with status set to a pending-like value (as defined by payment domain in DTO/enum in the schema mapping) and set amount/currency/provider/provider_reference.
 *    - Set deleted_at to null.
 *
 * 3) Call payment provider using provider and provider_reference semantics. Capture provider outcome:
 *    - On success: set shopping_mall_payments.status to succeeded and set paid_at.
 *    - On failure: set shopping_mall_payments.status to failed and persist error_code/error_message.
 *
 * 4) If and only if payment status is succeeded:
 *    - Create shopping_mall_orders row linked to the payment (shopping_payment_id) and customer (shopping_customer_id) derived from the checkout context.
 *    - Populate order snapshot/locked delivery fields captured at placement time: ship_to_name/phone/postal/region/city/street/detail, shipping_instructions, placed_at.
 *    - Insert shopping_mall_order_items rows for each purchased cart line item selected for checkout. Each order item must set seller_snapshot_id, seller_price_at_purchase, quantity, line_item_status='paid' (exact value per DTO/enum mapping), placed_at, and link shopping_mall_product_variant_id and shopping_mall_shipment_id as null (initially) if shipment grouping is created later.
 *    - Decrement inventory for each involved shopping_mall_product_variant consistent with order creation rules (inventory restoration rules for later cancellations are handled elsewhere).
 *    - Remove the purchased cart items from shopping_mall_cart_items. Since carts support deleted_at, prefer marking matching shopping_mall_cart_items.deleted_at rather than hard deletion, matching the existing schema’s design.
 *
 * 5) On payment failure:
 *    - Do NOT create any shopping_mall_orders or shopping_mall_order_items.
 *    - Do NOT decrement inventory or remove cart items.
 *
 * 6) Commit transaction.
 *
 * 7) Return response DTO for the created/updated payment record including status, provider_reference, and timestamps.
 *
 * Edge cases:
 * - Idempotency: if the same provider_reference is retried, ensure duplicates are handled consistently (either reject or return existing payment) according to DTO constraints.
 * - Concurrency: use transaction isolation so that cart items are not simultaneously modified between checkout summary and payment success flow.
 * - Validation failures: return 4xx and do not write any payment/order rows.
 *
 * Integration points:
 * - External payment provider adapter using provider identifier and provider_reference.
 * - Inventory/order/cart service functions that execute the inventory decrement and cart mutation only after confirmed payment success.
 * @path /shoppingMall/member/payments
 * @accessor api.functional.shoppingMall.member.payments.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Request payload to create a new payment attempt for the current checkout/order placement flow. Contains payment amount, currency, and provider reference details required to charge the customer, and any identifiers needed to associate the attempt with the customer’s order placement context.
     */
    body: IShoppingMallPayment.ICreate;
  };
  export type Body = IShoppingMallPayment.ICreate;
  export type Response = IShoppingMallPayment;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/member/payments",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/payments";
  export const random = (): IShoppingMallPayment =>
    typia.random<IShoppingMallPayment>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * This operation processes a customer payment attempt for an order placement flow by accepting the payment processing input and updating the corresponding record in `shopping_mall_payments`.
 *
 * In the platform’s domain model, `shopping_mall_payments` represents a distinct business event: the payment outcome gates whether an order can exist for further fulfillment. The operation must update `shopping_mall_payments.status` to reflect the attempt result, and when the payment succeeds it must set `shopping_mall_payments.paid_at` (and keep provider reference/error fields consistent with the provider result).
 *
 * When payment succeeds, the system must create an order in `shopping_mall_orders` linked by `shopping_mall_orders.shopping_payment_id`. In that case, the created order’s status behavior must reflect that payment succeeded (the order items become “paid” downstream, as required by the platform workflow).
 *
 * When payment fails, the system must not create any `shopping_mall_orders` (and therefore must not create order items) for that payment attempt. This keeps the visible order history consistent with the money-exchange rule that only successful payments lead to orders.
 *
 * Security and authorization: only authenticated actors who are allowed to place/confirm checkout for their own flow may call this operation. The service layer must validate ownership/scope by linking the payment attempt to the correct customer context, and must reject any attempt to update payment records outside the caller’s permitted scope.
 *
 * Validation and idempotency: the service must validate required payment fields (such as amount/currency/provider identity inputs) and handle provider callback/reference mismatches. If the same payment attempt is processed multiple times, the operation must ensure the resulting `status` and `paid_at` are consistent and must avoid creating duplicate `shopping_mall_orders` for a single successful `shopping_mall_payments` record.
 *
 * Related behavior: this endpoint is part of the checkout sequence where checkout confirmation triggers payment; order and order-item statuses are updated only after successful payment outcome, and successful payment is the prerequisite for order creation and subsequent fulfillment decisions.
 *
 * @param props.connection
 * @param props.body Payment processing input used to update a payment attempt and, on success, create the linked order outcome.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Service-layer algorithm: 1) Parse request payload to
 *   identify the targeted payment attempt context (at minimum: provider +
 *   provider_reference; and/or a payment attempt identifier if provided by the
 *   request DTO). 2) Load the target `shopping_mall_payments` row (by primary
 *   id or by a uniqueness-relevant lookup such as provider_reference), ensuring
 *   the caller is authorized for the payment attempt. 3) Start a DB
 *   transaction. 4) Apply provider outcome mapping: - On success: set
 *   `shopping_mall_payments.status` to the configured succeeded value, set
 *   `paid_at` to the provider confirmed timestamp (from request), clear error
 *   fields if appropriate (keep `error_code`/`error_message` null). - On
 *   failure: set `shopping_mall_payments.status` to the configured failed
 *   value, set `error_code`/`error_message` from request, and keep `paid_at`
 *   null. 5) If success: - Ensure no order exists for this payment attempt
 *   (enforced by `@@unique([shopping_payment_id])` on `shopping_mall_orders`).
 *   Query `shopping_mall_orders` by `shopping_payment_id` and create exactly
 *   one order if absent. - Populate `shopping_mall_orders` fields from the
 *   checkout payload context available to the service (ship_to_* fields,
 *   placed_at). Persist the locked snapshot address fields as plain captured
 *   address columns per schema. 6) Commit transaction.
 *
 * Edge cases:
 * - If an order already exists for the payment attempt, do not create a new one; return consistent data.
 * - If payment status transitions would be contradictory (e.g., failure after success), reject or make the transition idempotent based on the current stored `shopping_mall_payments.status`.
 * - If the provider reference does not match the payment attempt record, reject.
 *
 * Database access:
 * - SELECT from `shopping_mall_payments` (and optionally `shopping_mall_orders` by shopping_payment_id).
 * - INSERT into `shopping_mall_orders` only when payment succeeds and when no order exists.
 *
 * No snapshot creation rules are required here because this operation is a payment attempt outcome gate, not a direct editable concept snapshot in the provided analysis constraints; however, any downstream order-item status updates must occur only after successful payment as specified by the requirements.
 * @path /shoppingMall/member/payments
 * @accessor api.functional.shoppingMall.member.payments.processPayments
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function processPayments(
  connection: IConnection,
  props: processPayments.Props,
): Promise<processPayments.Response> {
  return true === connection.simulate
    ? processPayments.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...processPayments.METADATA,
          path: processPayments.path(),
          status: null,
        },
        props.body,
      );
}
export namespace processPayments {
  export type Props = {
    /**
     * Payment processing input used to update a payment attempt and, on success, create the linked order outcome.
     */
    body: IShoppingMallPayment.IRequest;
  };
  export type Body = IShoppingMallPayment.IRequest;
  export type Response = IShoppingMallPayment;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/member/payments",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/payments";
  export const random = (): IShoppingMallPayment =>
    typia.random<IShoppingMallPayment>();
  export const simulate = (
    connection: IConnection,
    props: processPayments.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: processPayments.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Retrieve a single payment attempt by its identifier.
 *
 * This operation returns the payment attempt record from `shopping_mall_payments`, including the attempted amount and currency, the payment provider identifier and provider-side reference, and the current payment attempt `status`. It also exposes timestamps used for audit and troubleshooting, such as `paid_at` (when present), `created_at`, and `updated_at`, plus optional failure diagnostics (`error_code`, `error_message`) when the attempt did not succeed.
 *
 * The `status` field indicates whether the payment attempt was successful or failed, and it is the key input for determining downstream order-creation behavior in the business workflow. This endpoint is therefore intended for clients that need to confirm the outcome of checkout payment attempts and show payment state to the user.
 *
 * Data visibility is governed by the system’s authorization policy: the implementation should ensure that only the owning customer (or permitted roles) and administrators can view the payment record associated with their account/context. The operation itself does not perform any filtering by customer id; it loads strictly by `paymentId`.
 *
 * Related operations: after successful checkout confirmation, the business workflow records payment and then reflects the outcome into order and order item statuses. Clients that need order-level details should use the corresponding order endpoints rather than relying on the payment record alone.
 *
 * @param props.connection
 * @param props.paymentId Target payment attempt identifier (UUID).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps: 1) Parse `paymentId` from path.
 *   2) Query `shopping_mall_payments` by primary key `id` (UUID) inside the
 *   repository/service layer. 3) If no record exists, return a not-found error.
 *   4) Return the full payment DTO mapped from the database columns: id,
 *   amount, currency, provider, provider_reference, status, paid_at,
 *   error_code, error_message, created_at, updated_at. 5) Authorization:
 *   enforce that the authenticated actor is permitted to view this payment
 *   record (ownership/admin check must be handled by shared middleware/service
 *   policy). Do not leak existence information across authorization boundaries.
 *
 * Edge cases:
 * - `paid_at`, `error_code`, and `error_message` are nullable; return null when the columns are null.
 * - `status` is stored as a string; return as-is.
 *
 * No side effects: this operation is read-only and must not create snapshots or mutate payment/order state.
 * @path /shoppingMall/member/payments/:paymentId
 * @accessor api.functional.shoppingMall.member.payments.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target payment attempt identifier (UUID).
     */
    paymentId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallPayment;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/member/payments/:paymentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/payments/${encodeURIComponent(props.paymentId ?? "null")}`;
  export const random = (): IShoppingMallPayment =>
    typia.random<IShoppingMallPayment>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("paymentId")(() => typia.assert(props.paymentId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Update an existing payment attempt outcome for a customer’s order placement flow.
 *
 * This endpoint targets the platform’s payment record in the `shopping_mall_payments` table. In the platform domain, the payment attempt is the gate that determines whether the corresponding order can proceed: the system treats the payment as a distinct business event, and payment outcome determines whether an order becomes valid for subsequent fulfillment steps. The operation updates the stored payment `status` and records provider-side confirmation data such as `paid_at` when the attempt succeeds, or `error_code` / `error_message` when it fails.
 *
 * Authorization-wise, this operation must be restricted to actors who are allowed to update payment attempts (typically administrative/system payment processing integration). It must ensure the payment attempt belongs to a scope the caller is permitted to manage. The endpoint must not create or modify orders directly by itself; instead, it should persist the payment outcome in `shopping_mall_payments`, and let the existing order creation/transition logic (already defined in the system) react to successful payment as described in the requirements.
 *
 * Data mapping is direct: the path parameter `paymentId` maps to `shopping_mall_payments.id`. The update should maintain consistent relationships via `shopping_mall_payments.orderForPayment` (a one-to-one relation through `shopping_mall_orders.shopping_payment_id` with `@@unique([shopping_payment_id])`). If an order already exists for this payment attempt, the implementation must enforce deterministic behavior so that the resulting order/payment-related states remain consistent with the payment `status`.
 *
 * Validation rules must ensure `status` is set to a value supported by the system’s payment workflow, and that `paid_at` is provided only when the payment is marked successful. When `status` indicates failure, `paid_at` must be null and failure details (`error_code`, `error_message`) should be provided (or left null if the provider did not return them). Any update must also respect column-level types: `amount` is a decimal/float, timestamps are timezone-aware (`timestamptz`), and `deleted_at` is managed by system retention logic (so the API should not accept updates for deletion fields).
 *
 * If the provided `paymentId` does not exist or is not accessible, the endpoint must reject the request with an appropriate error response.
 *
 * Related operations: order creation and cart cleanup are triggered when payment succeeds. Review the payment-outcome workflow described in the requirements so that any state transition triggered by this update remains consistent across the system.
 *
 * @param props.connection
 * @param props.paymentId The target payment attempt ID to update.
 * @param props.body Payment update request including the new payment status and outcome details (e.g., paid_at on success or error_code/error_message on failure).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps: 1) Validate path parameter
 *   `paymentId` is a UUID. 2) Load `shopping_mall_payments` by id where `id ==
 *   paymentId` and ensure it is not marked as deleted if the system excludes
 *   deleted rows from updates. 3) Validate request body: - Ensure `status` is
 *   provided and is compatible with the payment workflow. - If setting `status`
 *   to a succeeded value, require `paid_at` to be non-null; otherwise require
 *   `paid_at` to be null. - If setting to a failed value, ensure `error_code`
 *   and/or `error_message` are set (when provided by the client). - Do not
 *   allow updating `deleted_at` from the API request. 4) Within a transaction:
 *   - Update `shopping_mall_payments` columns: status, paid_at,
 *   provider_reference, error_code, error_message, and other non-sensitive
 *   fields if included by the request DTO (amount/currency/provider) but ensure
 *   consistency. - If the payment becomes successful and no corresponding
 *   `shopping_mall_orders` exists for `shopping_payment_id` yet, trigger the
 *   existing order creation flow (create order + order items in paid state,
 *   decrease inventory for purchased variants, and remove purchased items from
 *   the customer cart) as required by the domain rules. - If payment is updated
 *   from failed to succeeded after an order already exists, ensure the system
 *   does not duplicate order creation; enforce idempotency using the one-to-one
 *   relation (orderForPayment / unique shopping_payment_id). - If payment is
 *   updated from succeeded to failed (if allowed by workflow), ensure status
 *   transitions do not break ordering/history rules; otherwise reject such
 *   transitions. 5) Return the updated payment record using the appropriate
 *   response DTO (entity detail).
 *
 * Edge cases:
 * - Payment not found: return 404.
 * - Status transitions that would violate domain invariants: return 409.
 * - Missing required fields for the chosen status outcome: return 400.
 * - Concurrent updates: use optimistic locking if available, or re-check the current payment status inside the transaction to guarantee deterministic outcomes.
 * @path /shoppingMall/member/payments/:paymentId
 * @accessor api.functional.shoppingMall.member.payments.updatePayment
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function updatePayment(
  connection: IConnection,
  props: updatePayment.Props,
): Promise<updatePayment.Response> {
  return true === connection.simulate
    ? updatePayment.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...updatePayment.METADATA,
          path: updatePayment.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace updatePayment {
  export type Props = {
    /**
     * The target payment attempt ID to update.
     */
    paymentId: string & tags.Format<"uuid">;

    /**
     * Payment update request including the new payment status and outcome details (e.g., paid_at on success or error_code/error_message on failure).
     */
    body: IShoppingMallPayment.IUpdate;
  };
  export type Body = IShoppingMallPayment.IUpdate;
  export type Response = IShoppingMallPayment;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/member/payments/:paymentId",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/member/payments/${encodeURIComponent(props.paymentId ?? "null")}`;
  export const random = (): IShoppingMallPayment =>
    typia.random<IShoppingMallPayment>();
  export const simulate = (
    connection: IConnection,
    props: updatePayment.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: updatePayment.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("paymentId")(() => typia.assert(props.paymentId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Permanently removes a specific payment attempt record identified by `paymentId`.
 *
 * This operation targets the `shopping_mall_payments` table, which represents one payment attempt associated with a customer order placement flow. The record includes the attempted `amount`, `currency`, `provider`, `provider_reference`, current `status`, optional `paid_at` timestamp, and optional `error_code`/`error_message`, plus `created_at`/`updated_at` timestamps.
 *
 * Security and authorization are required: only an allowed actor (typically the platform administrator, or a permitted back-office role depending on your authorization configuration) should be able to erase payment attempt records. The operation must not allow unauthenticated callers. When the caller is not allowed to access this payment attempt, the system must reject the request.
 *
 * Validation and error handling: the server must validate `paymentId` as a UUID. If no `shopping_mall_payments` record exists for the provided identifier, the operation must reject with a not-found error rather than creating or returning any data.
 *
 * Data integrity expectations: deleting a payment attempt record must not modify immutable snapshot records. If the payment attempt is referenced by other domain data needed for dispute resolution or legal/audit requirements, the implementation must ensure referential integrity (either by blocking deletion or by following the project’s configured retention strategy). Because explicit payment-deletion workflow rules are not specified in the loaded requirements, implementations should treat this endpoint as an administrative record cleanup operation and keep downstream consistency as the priority.
 *
 * Clients should not rely on any payment provider callbacks after this API call; the operation only affects the database record identified by `paymentId`.
 *
 * Related operations: payment viewing endpoints (not specified here) should be used to inspect payment attempt details before deciding to erase the record.
 *
 * @param props.connection
 * @param props.paymentId Target payment attempt record identifier to erase.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Authorization - Require authentication. - Enforce
 *   authorization for erasing payment records (e.g., admin/back-office). If the
 *   caller lacks permission, return 403.
 *
 * 2) Input validation
 * - Parse `paymentId` from path as UUID.
 * - If invalid UUID format, return 400.
 *
 * 3) Lookup
 * - Start a transaction.
 * - Query `shopping_mall_payments` by `id = paymentId`.
 * - If not found, rollback transaction and return 404.
 *
 * 4) Deletion behavior
 * - Erase the record from `shopping_mall_payments`.
 * - If the underlying database is configured to treat `deleted_at` as a logical deletion indicator, follow that model consistently; otherwise perform physical deletion. Do not invent additional columns.
 *
 * 5) Referential integrity / consistency
 * - If foreign key constraints or application-level references prevent deletion, return an error (typically 409) with a clear message.
 * - Do not alter any `shopping_mall_snapshots` or other snapshot records.
 *
 * 6) Commit and response
 * - Commit transaction.
 * - Return HTTP 200/204 (implementation choice) with `responseBody = null` as defined for this operation.
 *
 * Edge cases
 * - Concurrent deletion: if the record disappears between lookup and delete, treat as not-found (404) or conflict (409) depending on implementation conventions.
 * @path /shoppingMall/member/payments/:paymentId
 * @accessor api.functional.shoppingMall.member.payments.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Target payment attempt record identifier to erase.
     */
    paymentId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/member/payments/:paymentId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/payments/${encodeURIComponent(props.paymentId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("paymentId")(() => typia.assert(props.paymentId));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
