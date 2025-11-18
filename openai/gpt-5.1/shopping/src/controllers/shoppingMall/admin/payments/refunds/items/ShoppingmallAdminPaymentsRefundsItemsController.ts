import { Controller } from "@nestjs/common";
import { TypedRoute, TypedParam, TypedBody } from "@nestia/core";
import typia, { tags } from "typia";

import { IShoppingMallPaymentRefundItem } from "../../../../../../api/structures/IShoppingMallPaymentRefundItem";
import { IPageIShoppingMallPaymentRefundItem } from "../../../../../../api/structures/IPageIShoppingMallPaymentRefundItem";

@Controller(
  "/shoppingMall/admin/payments/:orderPaymentId/refunds/:refundSequence/items",
)
export class ShoppingmallAdminPaymentsRefundsItemsController {
  /**
   * Create a single refund line item in shopping_mall_payment_refund_items
   * for a specific payment refund sequence.
   *
   * Create a single refund line item record associated with a specific order
   * payment refund sequence.
   *
   * This operation is centered on the `shopping_mall_payment_refund_items`
   * table, which, per the Prisma schema description, stores the
   * per-order-item breakdown of a refund. Each record typically references an
   * order item from `shopping_mall_order_items`, a logical payment from
   * `shopping_mall_order_payments`, and a parent refund record from
   * `shopping_mall_payment_refunds`. By exposing this POST endpoint under
   * `/payments/{orderPaymentId}/refunds/{refundSequence}/items`, the API
   * makes explicit that every refund item belongs to a particular payment
   * (`orderPaymentId`) and a particular refund instance distinguished by
   * `refundSequence`.
   *
   * From a business perspective, the request body represented by
   * `IShoppingMallPaymentRefundItem.ICreate` contains only the granular
   * refund details, such as which order item is being refunded, the amount or
   * quantity being refunded, and any allocation across taxes, shipping, or
   * fees, all derived from the underlying Prisma fields. The path parameters
   * `orderPaymentId` and `refundSequence` are not repeated in the DTO;
   * instead, the service logic uses them to locate the parent
   * `shopping_mall_order_payments` and `shopping_mall_payment_refunds`
   * records, ensuring that the created row in
   * `shopping_mall_payment_refund_items` is properly linked. Validation rules
   * derived from the payment and order models must guarantee that the refund
   * item does not exceed the original paid amount or quantity, that the order
   * and payment are in states where refunds are allowed, and that any policy
   * constraints from `shopping_mall_business_policies` or related policy
   * tables are satisfied.
   *
   * Security and authorization for this operation are critical because
   * refunds directly impact financial balances. Only privileged
   * administrative actors should be allowed to call this API, which is
   * reflected by `authorizationActor: "admin"`. In an actual implementation,
   * additional checks based on `shopping_mall_admin_roles` and
   * `shopping_mall_admin_permissions` would enforce that only admins with
   * refund-management permissions can invoke it. This API will typically be
   * used together with the refund request and case management endpoints based
   * on `shopping_mall_refund_requests`, `shopping_mall_disputes`, and
   * `shopping_mall_risk_cases`, where higher-level workflows decide that a
   * refund should be granted and then call this endpoint to materialize the
   * line-level breakdown.
   *
   * Error handling should cover invalid or unknown `orderPaymentId`, unknown
   * `refundSequence` within the scope of that payment, attempts to refund
   * amounts greater than originally paid, attempts to refund items that are
   * no longer eligible according to review and policy tables, and concurrency
   * conflicts where multiple refund operations touch the same order items.
   * When validation fails, the API should respond with appropriate error
   * codes and messages; on success, it returns the created refund line item
   * using the `IShoppingMallPaymentRefundItem` representation so that clients
   * can immediately see the resulting breakdown and any computed fields such
   * as totals or currency conversions.
   *
   * @param connection
   * @param orderPaymentId Unique identifier of the logical order payment to
   *   which this refund and its line item belong. This corresponds to the
   *   primary key of the parent payment record in the
   *   shopping_mall_order_payments table and provides the payment-level scope
   *   for the refund.
   * @param refundSequence Sequence identifier of the specific refund instance
   *   under the given order payment. This value, together with
   *   orderPaymentId, is used to locate the parent refund record in
   *   shopping_mall_payment_refunds so that the newly created refund item in
   *   shopping_mall_payment_refund_items is correctly linked.
   * @param body Refund line item creation payload containing the
   *   per-order-item breakdown of the refund to be created under the
   *   specified payment and refund sequence. Path parameters supply the
   *   parent payment and refund identifiers, so the DTO focuses only on
   *   line-level fields such as order item references, quantities, and
   *   monetary amounts.
   * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("orderPaymentId")
    orderPaymentId: string & tags.Format<"uuid">,
    @TypedParam("refundSequence")
    refundSequence: string,
    @TypedBody()
    body: IShoppingMallPaymentRefundItem.ICreate,
  ): Promise<IShoppingMallPaymentRefundItem> {
    orderPaymentId;
    refundSequence;
    body;
    return typia.random<IShoppingMallPaymentRefundItem>();
  }

  /**
   * List and search refund item breakdowns in
   * shopping_mall_payment_refund_items for a specific refund of an order
   * payment.
   *
   * Retrieve a filtered and paginated list of refund item breakdown records
   * for a specific refund of a given order payment.
   *
   * This operation reads from the `shopping_mall_payment_refund_items` table,
   * which holds the granular allocation of a refund to different order items,
   * SKUs, taxes, shipping charges, or other monetary components. Each record
   * is linked to a parent refund row in `shopping_mall_payment_refunds`, and
   * that refund is itself tied to a logical order payment entry in
   * `shopping_mall_order_payments`. The path parameters `orderPaymentId`
   * (logical payment identifier) and `refundSequence` (sequence number of the
   * refund per payment) define the parent refund context. Only items
   * belonging to that specific refund will be considered by this search
   * operation.
   *
   * The request body uses the `IShoppingMallPaymentRefundItem.IRequest` DTO,
   * which should encapsulate typical search, filter, and pagination
   * parameters for refund item listings. These may include order item
   * identifiers, SKU or product references, minimum and maximum refunded
   * amounts, date ranges for when the refund items were created, and sort
   * options such as by creation date or amount. The design follows the
   * general pattern for list/search endpoints: the PATCH method is chosen to
   * allow complex, structured query payloads beyond simple query parameters.
   * This offers flexibility for future expansion of filter capabilities
   * without changing the URL structure.
   *
   * The response returns a paginated collection using the
   * `IPageIShoppingMallPaymentRefundItem.ISummary` type, where each summary
   * item provides the key attributes required to understand the distribution
   * of the refund, such as linked order item identifiers, refunded principal
   * and tax amounts, and possibly high-level status indicators. More detailed
   * per-item information, if needed, can be obtained from a dedicated detail
   * endpoint (for example, a GET operation on a single refund item), but the
   * summary is optimized for tabular views in admin interfaces or
   * reconciliation tools.
   *
   * From a security perspective, this endpoint is restricted to admin actors
   * because it exposes low-level financial breakdown data that should not be
   * available to general users or even sellers directly. Admin tools can use
   * this operation in conjunction with other payments, refunds, and dispute
   * endpoints to analyze complex financial scenarios, reconcile seller
   * earnings, or audit the correctness of refunds. Error handling should
   * properly distinguish between cases where the specified payment or refund
   * context does not exist, and cases where the context exists but no items
   * match the given filters, returning an empty page in the latter scenario.
   *
   * @param connection
   * @param orderPaymentId Unique identifier of the logical order payment
   *   whose refund item breakdowns should be listed. This corresponds to the
   *   primary key of a record in the `shopping_mall_order_payments` table and
   *   scopes which payment the refund belongs to.
   * @param refundSequence Sequence number of the refund associated with the
   *   specified order payment. Together with `orderPaymentId`, this
   *   identifies the parent refund in `shopping_mall_payment_refunds` whose
   *   item breakdowns are being queried.
   * @param body Search, filter, and pagination criteria for listing refund
   *   item breakdowns associated with a specific refund of a given order
   *   payment.
   * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("orderPaymentId")
    orderPaymentId: string & tags.Format<"uuid">,
    @TypedParam("refundSequence")
    refundSequence: number & tags.Type<"int32">,
    @TypedBody()
    body: IShoppingMallPaymentRefundItem.IRequest,
  ): Promise<IPageIShoppingMallPaymentRefundItem.ISummary> {
    orderPaymentId;
    refundSequence;
    body;
    return typia.random<IPageIShoppingMallPaymentRefundItem.ISummary>();
  }

  /**
   * Get a single refund line item from shopping_mall_payment_refund_items for
   * a specific payment refund sequence.
   *
   * Retrieve the detailed information of a specific refund line item
   * belonging to a given order payment refund sequence.
   *
   * This operation targets a single record in the
   * `shopping_mall_payment_refund_items` table, which stores line-level
   * breakdowns of refunds. By using the path
   * `/payments/{orderPaymentId}/refunds/{refundSequence}/items/{refundItemId}`,
   * the API ensures that the refund item is looked up in the proper context:
   * an `orderPaymentId` that identifies the parent logical payment in
   * `shopping_mall_order_payments`, a `refundSequence` that identifies a
   * particular refund case or attempt in `shopping_mall_payment_refunds`, and
   * a `refundItemId` that represents one row in
   * `shopping_mall_payment_refund_items`. This hierarchical scoping helps
   * prevent accidental cross-payment or cross-refund access to refund items.
   *
   * The operation returns an `IShoppingMallPaymentRefundItem` DTO that
   * mirrors the fields of the underlying Prisma model and related entities,
   * such as references to the original order item
   * (`shopping_mall_order_items`), monetary allocation fields for product
   * price, taxes, shipping, or fees, and audit-related fields like creation
   * and update timestamps. Any description comments defined on
   * `shopping_mall_payment_refund_items` and its foreign key relationships
   * should be reflected in the DTO documentation so that API consumers
   * clearly understand what each field represents in the context of the
   * refund workflow.
   *
   * Access to this endpoint is restricted to administrative actors, as refund
   * details are financial and may include sensitive information such as exact
   * price components or fee allocations. Using `authorizationActor: "admin"`
   * communicates that only authenticated admins may retrieve this data, while
   * underlying business logic can add further checks based on
   * `shopping_mall_admin_roles`, `shopping_mall_admin_permissions`, and
   * potentially `shopping_mall_legal_holds` or risk-related models if
   * additional governance rules apply. This read-only endpoint is typically
   * used in conjunction with higher-level case management views built on
   * tables such as `shopping_mall_refund_requests`, `shopping_mall_disputes`,
   * and related snapshot statistics tables to give operations staff full
   * visibility into how refunds are broken down per order item.
   *
   * @param connection
   * @param orderPaymentId Unique identifier of the logical order payment
   *   whose refund item is being retrieved. This maps to the primary key of a
   *   record in the shopping_mall_order_payments table and scopes the refund
   *   to a specific payment.
   * @param refundSequence Sequence identifier of the refund instance under
   *   the specified order payment. Together with orderPaymentId, this locates
   *   the parent refund record in shopping_mall_payment_refunds that owns the
   *   requested refund item.
   * @param refundItemId Unique identifier of the refund line item to retrieve
   *   from shopping_mall_payment_refund_items. This value is used in
   *   combination with orderPaymentId and refundSequence to ensure the
   *   correct refund item record is selected.
   * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
   */
  @TypedRoute.Get(":refundItemId")
  public async at(
    @TypedParam("orderPaymentId")
    orderPaymentId: string & tags.Format<"uuid">,
    @TypedParam("refundSequence")
    refundSequence: string,
    @TypedParam("refundItemId")
    refundItemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallPaymentRefundItem> {
    orderPaymentId;
    refundSequence;
    refundItemId;
    return typia.random<IShoppingMallPaymentRefundItem>();
  }

  /**
   * Update a specific shopping_mall_payment_refund_items record for a given
   * order payment refund.
   *
   * Update an existing item-level payment refund item in the context of a
   * particular order payment refund.
   *
   * This operation works on the shopping_mall_payment_refund_items table,
   * which is described as a per-order-item breakdown of a refund. Each record
   * represents how much quantity and monetary value of a specific order item
   * is being refunded for a particular refund operation. The table includes
   * fields such as refunded_quantity, unit_price_amount, line_refund_amount,
   * and an optional reason_code that can capture item-specific reasons like
   * "damaged" or "wrong_item".
   *
   * To precisely scope the target record, the API path includes three
   * identifiers:
   *
   * - OrderPaymentId: the UUID of the parent logical payment from
   *   shopping_mall_order_payments.
   * - RefundSequence: the integer refund_sequence of the refund within that
   *   payment, as defined on shopping_mall_payment_refunds.
   * - RefundItemId: the UUID primary key of the refund item in
   *   shopping_mall_payment_refund_items. The implementation must verify that
   *   the refund item with refundItemId belongs to the refund specified by
   *   orderPaymentId and refundSequence by traversing the relations
   *   shopping_mall_payment_refund_items.shopping_mall_payment_refund_id →
   *   shopping_mall_payment_refunds.id and
   *   shopping_mall_payment_refunds.shopping_mall_order_payment_id →
   *   shopping_mall_order_payments.id. If these do not align, the API must
   *   return an error indicating that the resource does not exist under the
   *   given parent context.
   *
   * From a validation and business rule perspective, the request body must
   * conform to IShoppingMallPaymentRefundItem.IUpdate. That DTO is expected
   * to allow modification of refundable quantities and monetary amounts while
   * preserving invariants such as non-negative refunded_quantity and
   * line_refund_amount, and consistency with the parent refund’s
   * currency_code and approved_amount on shopping_mall_payment_refunds.
   * Additional checks may include ensuring that the cumulative refunded
   * quantities and amounts across all refund items for the same order item
   * and refund do not exceed the original charged quantities and amounts in
   * shopping_mall_order_items.
   *
   * Security-wise, this operation should be restricted to authorized
   * back-office or finance operators represented by the "admin" actor.
   * Customers and sellers should not directly manipulate refund item
   * breakdowns at this level of granularity; they instead initiate
   * higher-level refund requests which internal tools translate into these
   * detailed records. The authorization layer must ensure that only
   * authenticated admins can invoke this endpoint.
   *
   * In terms of lifecycle interactions, this update operation is typically
   * used after an initial refund item is created and before the parent refund
   * record in shopping_mall_payment_refunds transitions to a terminal status
   * such as "completed" or "failed". Related operations include creating new
   * refund items for a refund (POST endpoint not covered here) and updating
   * the refund header itself. If the parent refund has already been finalized
   * at the payment provider, the implementation should either reject updates
   * with a business error or permit only non-financial metadata changes
   * according to policy.
   *
   * Error handling should include:
   *
   * - 404 Not Found when the specified refund item does not exist under the
   *   given order payment and refund_sequence.
   * - 400 Bad Request when the updated refunded_quantity or line_refund_amount
   *   values violate business constraints, such as exceeding allowed totals
   *   or being negative.
   * - 409 Conflict when concurrent updates or parent refund status transitions
   *   make the requested modification invalid at the time of processing.
   *
   * This endpoint is closely related to the DELETE
   * /payments/{orderPaymentId}/refunds/{refundSequence}/items/{refundItemId}
   * operation, which removes a refund item when it is no longer needed before
   * the refund is finalized. Clients managing refund details will typically
   * use these two operations together to maintain a consistent item-level
   * breakdown.
   *
   * @param connection
   * @param orderPaymentId Unique identifier of the parent logical order
   *   payment, corresponding to shopping_mall_order_payments.id.
   * @param refundSequence Sequence number of the refund for the given
   *   payment, corresponding to shopping_mall_payment_refunds.refund_sequence
   *   within the specified shopping_mall_order_payment_id context.
   * @param refundItemId Primary key of the item-level refund breakdown record
   *   to update, corresponding to shopping_mall_payment_refund_items.id.
   * @param body Fields to update on the item-level payment refund breakdown,
   *   including refundable quantity, unit price amount, line refund amount,
   *   and optional item-level reason code.
   * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
   */
  @TypedRoute.Put(":refundItemId")
  public async update(
    @TypedParam("orderPaymentId")
    orderPaymentId: string & tags.Format<"uuid">,
    @TypedParam("refundSequence")
    refundSequence: number & tags.Type<"int32">,
    @TypedParam("refundItemId")
    refundItemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallPaymentRefundItem.IUpdate,
  ): Promise<IShoppingMallPaymentRefundItem> {
    orderPaymentId;
    refundSequence;
    refundItemId;
    body;
    return typia.random<IShoppingMallPaymentRefundItem>();
  }

  /**
   * Delete a specific shopping_mall_payment_refund_items record for a given
   * order payment refund before finalization.
   *
   * Delete an existing item-level payment refund item associated with a
   * particular order payment refund before the refund is finalized.
   *
   * This endpoint operates on the shopping_mall_payment_refund_items table,
   * whose rows represent the per-order-item breakdown of a payment refund.
   * Each record links to a parent refund via shopping_mall_payment_refund_id
   * and to a specific order item via shopping_mall_order_item_id. The table
   * stores refunded_quantity, unit_price_amount, line_refund_amount, and an
   * optional reason_code describing why this particular item is being
   * refunded.
   *
   * The URL structure includes three path parameters to fully identify the
   * resource in its financial context:
   *
   * - OrderPaymentId: the UUID of the shopping_mall_order_payments record to
   *   which the refund belongs.
   * - RefundSequence: the integer refund_sequence field on
   *   shopping_mall_payment_refunds that distinguishes multiple refunds for
   *   the same payment.
   * - RefundItemId: the UUID primary key of the refund item in
   *   shopping_mall_payment_refund_items. The provider logic must validate
   *   that a shopping_mall_payment_refund_items row with id = refundItemId
   *   exists and that its shopping_mall_payment_refund_id points to a
   *   shopping_mall_payment_refunds record whose
   *   shopping_mall_order_payment_id and refund_sequence match the
   *   orderPaymentId and refundSequence path parameters. If there is any
   *   mismatch, the correct behavior is to return a 404 Not Found to indicate
   *   that the requested resource does not exist in the given parent
   *   context.
   *
   * From a business rule perspective, deletion is only allowed while the
   * parent refund in shopping_mall_payment_refunds is in a mutable status
   * such as "pending" or perhaps "approved" but not yet executed, depending
   * on platform policy. Once the parent refund has reached a terminal
   * financial state such as "completed" or a locked "failed" status, the
   * breakdown of refunded items becomes part of the immutable financial audit
   * trail and should no longer be altered. The implementation must enforce
   * these constraints by checking the status field on the parent refund
   * record before performing the deletion.
   *
   * This operation is intended for use by internal administrative or finance
   * tooling rather than by customers or sellers directly. Therefore,
   * authorization is restricted to the "admin" actor, reflecting that only
   * administrative users are allowed to manipulate low-level refund item
   * breakdowns. The security layer should authenticate the caller and ensure
   * they have the correct administrative privileges before proceeding.
   *
   * On success, the refund item row is removed from
   * shopping_mall_payment_refund_items, and any aggregate amounts on the
   * parent refund or payment such as refunded_amount on
   * shopping_mall_payment_refunds or shopping_mall_order_payments should be
   * recalculated or updated accordingly to remain consistent with the
   * remaining refund items. If the deletion would cause inconsistencies with
   * other domain rules (for example, reducing refunded quantities or amounts
   * below what has already been processed by the payment provider), the
   * operation should be rejected with an appropriate business error.
   *
   * Error handling includes:
   *
   * - 404 Not Found when the specified refund item is not found under the given
   *   payment and refund_sequence.
   * - 409 Conflict when the parent refund is in a non-editable status that
   *   forbids structural changes to its item-level breakdown.
   * - 400 Bad Request when deletion would contradict other enforced invariants,
   *   such as required minimum refunded amounts that must be preserved for
   *   compliance.
   *
   * This endpoint is closely related to the PUT
   * /payments/{orderPaymentId}/refunds/{refundSequence}/items/{refundItemId}
   * operation, which updates existing refund items instead of deleting them.
   * Together, they provide full administrative control over the composition
   * of item-level refund breakdowns prior to refund finalization.
   *
   * @param connection
   * @param orderPaymentId Unique identifier of the parent logical order
   *   payment, corresponding to shopping_mall_order_payments.id.
   * @param refundSequence Sequence number of the refund for the given
   *   payment, corresponding to shopping_mall_payment_refunds.refund_sequence
   *   within the specified shopping_mall_order_payment_id context.
   * @param refundItemId Primary key of the item-level refund breakdown record
   *   to delete, corresponding to shopping_mall_payment_refund_items.id.
   * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
   */
  @TypedRoute.Delete(":refundItemId")
  public async erase(
    @TypedParam("orderPaymentId")
    orderPaymentId: string & tags.Format<"uuid">,
    @TypedParam("refundSequence")
    refundSequence: number & tags.Type<"int32">,
    @TypedParam("refundItemId")
    refundItemId: string & tags.Format<"uuid">,
  ): Promise<void> {
    orderPaymentId;
    refundSequence;
    refundItemId;
    return typia.random<void>();
  }
}
