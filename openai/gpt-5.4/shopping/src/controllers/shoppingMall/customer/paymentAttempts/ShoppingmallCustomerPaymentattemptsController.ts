import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallPaymentAttempt } from "../../../../api/structures/IPageIShoppingMallPaymentAttempt";
import { IShoppingMallPaymentAttempt } from "../../../../api/structures/IShoppingMallPaymentAttempt";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { deleteShoppingMallCustomerPaymentAttemptsPaymentAttemptId } from "../../../../providers/deleteShoppingMallCustomerPaymentAttemptsPaymentAttemptId";
import { getShoppingMallCustomerPaymentAttemptsPaymentAttemptId } from "../../../../providers/getShoppingMallCustomerPaymentAttemptsPaymentAttemptId";
import { patchShoppingMallCustomerPaymentAttempts } from "../../../../providers/patchShoppingMallCustomerPaymentAttempts";
import { postShoppingMallCustomerPaymentAttempts } from "../../../../providers/postShoppingMallCustomerPaymentAttempts";
import { putShoppingMallCustomerPaymentAttemptsPaymentAttemptId } from "../../../../providers/putShoppingMallCustomerPaymentAttemptsPaymentAttemptId";

@Controller("/shoppingMall/customer/paymentAttempts")
export class ShoppingmallCustomerPaymentattemptsController {
  /**
   * Initiate a checkout payment attempt for the authenticated customer.
   *
   * This operation creates a new payment-attempt record in the payment processing stage that occurs after checkout review and before order creation. According to the payment-attempt requirements, the platform must treat this step as the business boundary between a reviewed purchase and an actual order. The underlying `shopping_mall_payment_attempts` table is designed to preserve both failed and successful checkout payment attempts so the platform can support retry behavior, audit payment outcomes, and trace the commercial event that may later lead to an order. The created record stores the customer association, the submitted payment amount, the external gateway provider, the provider-issued reconciliation reference, the current processing result, and any eventual failure reason.
   *
   * This endpoint is intended only for an authenticated customer acting on the customer's own checkout. The payment attempt belongs to one customer through `shopping_mall_payment_attempts.shopping_mall_customer_id`, and the requirements state that payment attempt initiation is associated with the customer who confirmed the checkout review. Seller, administrator, and super-administrator roles are not the actors for this creation flow because they do not initiate customer checkout payments. The caller must already have completed the checkout review step before invoking this operation.
   *
   * The operation is closely related to order creation but does not itself document the order as guaranteed output in every case. The requirements state that order creation depends on payment success: when the payment attempt succeeds, the platform shall create an order; when the payment attempt fails, the platform shall not create the order. This aligns with the schema relationship in which `shopping_mall_orders.shopping_mall_payment_attempt_id` optionally links an order back to the successful attempt. Consumers should therefore understand this API as the payment trigger and audit record for checkout, while downstream order visibility should be obtained through the order APIs after a successful result has been processed.
   *
   * From a data perspective, this operation writes the atomic attempt-level facts captured by the `shopping_mall_payment_attempts` model rather than denormalized order or cart details. The table comment emphasizes that failed attempts remain preserved even when no order is created, supporting payment troubleshooting, customer payment history, and gateway reconciliation. The response should therefore expose the created payment-attempt resource with its current status so clients can determine whether checkout has progressed to a successful payment outcome or remains failed or pending.
   *
   * If external gateway processing cannot complete successfully, the platform must preserve the failed outcome distinctly from a completed purchase. A failed attempt must not be treated as an order, and any gateway rejection reason should be reflected through the payment-attempt record when available. API consumers that need to inspect the resulting order should use order retrieval operations only after this endpoint returns a successful payment-attempt status and downstream order creation has completed.
   *
   * @param connection
   * @param body Payment initiation information for checkout
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Authenticate the caller as a customer and derive
     *   the target customer ID from the active session rather than trusting any
     *   customer identifier in the request body.
   *
   * Validate the request payload needed to submit a payment to the external gateway. Confirm that the checkout review context being paid for is still valid, that the computed payable amount is positive, and that the selected gateway provider is one supported by the service. Recalculate or verify the final amount from the reviewed checkout context on the server side so the persisted `shopping_mall_payment_attempts.amount` represents the authoritative commercial amount submitted for payment.
   *
   * Create a new `shopping_mall_payment_attempts` row with a generated UUID `id`, the authenticated customer's `shopping_mall_customer_id`, the authoritative `amount`, the chosen `gateway_provider`, a provider reconciliation value in `gateway_reference`, and an initial `status` representing the processing state. Set `created_at` and `updated_at` to the current timestamp. If the gateway has not yet returned a terminal outcome at insert time, leave `processed_at` and `failure_reason` null.
   *
   * Invoke the external payment gateway as part of the checkout payment flow. Map the gateway response into the persisted attempt record. On success, update the attempt status to the service's success value, set `processed_at`, clear `failure_reason`, and continue the downstream order-creation workflow defined by the requirements. Create one `shopping_mall_orders` record linked through `shopping_mall_orders.shopping_mall_payment_attempt_id`, then create the related `shopping_mall_order_items` and the required `shopping_mall_order_address_snapshots` record using the reviewed checkout data. Ensure order creation occurs only once for a successful payment attempt because `shopping_mall_orders.shopping_mall_payment_attempt_id` is unique.
   *
   * On gateway failure, update the payment attempt with a failed status, set `processed_at`, and store the returned failure reason when available. Do not create an order when the attempt fails. Preserve the failed attempt record for auditability and future troubleshooting.
   *
   * Wrap the persistence steps that finalize payment outcome and any downstream order creation in a transaction so the resulting state cannot represent a successful payment attempt without its required order records, or an order linked to a non-successful attempt. Handle unique-constraint conflicts for gateway reconciliation values and for repeated processing of the same successful attempt idempotently where possible. Return the created payment-attempt resource after all status updates are applied so the client receives the authoritative current outcome.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallPaymentAttempt.ICreate,
  ): Promise<IShoppingMallPaymentAttempt> {
    try {
      return await postShoppingMallCustomerPaymentAttempts({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of the authenticated customer's payment attempts.
   *
   * This operation exposes checkout payment processing history from the shopping_mall_payment_attempts table, which preserves both failed and successful payment attempts initiated during customer checkout before an order is finalized. It allows a signed-in customer to review attempt-level commercial facts such as the current result status, submitted amount, payment gateway provider, gateway reconciliation reference, failure reason, and processing timestamps. Because the underlying model intentionally stores atomic attempt records rather than denormalized order details, this endpoint is designed for attempt-history browsing rather than complete order inspection.
   *
   * The operation is intended for authenticated customer use only. Each result must be limited to payment attempts whose shopping_mall_customer_id matches the currently authenticated customer account in shopping_mall_customers. This ownership boundary is important because payment attempts reflect private checkout activity tied to a registered customer identity. The endpoint must not expose another customer's payment attempt history, gateway references, or failure information.
   *
   * The business context for this endpoint is closely related to the payment retry flow. The requirements state that when a payment attempt fails, the customer may retry payment for the same reviewed purchase, and each retry must create a new payment attempt. A successful retry results in order creation, while a failed retry continues to withhold order creation. For that reason, this list should help the customer distinguish between failed, pending, and succeeded attempts, and it may optionally surface whether an attempt is already linked to an order through shopping_mall_orders.shopping_mall_payment_attempt_id. Consumers that need full order details should use the dedicated order retrieval APIs after identifying a successful attempt that produced an order.
   *
   * Filtering and pagination are necessary because payment attempt history can grow over time, especially when customers retry failed payments. The request body should therefore support search conditions such as status, gateway provider, created-at range, processed-at range, and sorting preferences. The response should be optimized for list displays by returning summary records rather than a fully expanded object graph.
   *
   * If the caller is not authenticated as a customer, the operation must be rejected. If the request contains unsupported filter fields or invalid paging and sorting values, the operation must reject the request without altering any payment or order data. This endpoint is read-only and must not create orders, trigger retries, or modify the state of payment attempts.
   *
   * @param connection
   * @param body Payment attempt search criteria and pagination options
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement this operation as a customer-scoped
     *   search over shopping_mall_payment_attempts.
   *
   * 1. Authenticate the caller as a customer and resolve the current shopping_mall_customers.id. Reject the request when there is no active authenticated customer context.
   * 2. Parse IShoppingMallPaymentAttempt.IRequest as the list-query object. Support pagination inputs, sorting inputs, and optional filters grounded in the actual schema: status, gatewayProvider, createdAt range, processedAt range, and amount range if that field exists in the request DTO design. Do not accept arbitrary unsupported fields.
   * 3. Build a query against shopping_mall_payment_attempts filtered by shopping_mall_customer_id = currentCustomerId. Exclude logically removed rows when the service-wide list policy treats deleted_at as non-browsable; do not expose deleted records in normal customer history results.
   * 4. Apply optional filters using the actual columns: status, gateway_provider, created_at, processed_at, and amount. Apply deterministic sorting, defaulting to newest created_at first when no sort is supplied.
   * 5. For each payment attempt row, optionally left join shopping_mall_orders on shopping_mall_orders.shopping_mall_payment_attempt_id = shopping_mall_payment_attempts.id when the summary DTO needs to indicate whether the attempt produced an order or expose an order code. Keep the response list lightweight.
   * 6. Return a paginated IPageIShoppingMallPaymentAttempt.ISummary response containing pagination metadata and summary rows.
   * 7. Error handling: reject unauthenticated access, reject malformed filters, reject invalid pagination or sort directives, and return an empty page rather than an error when the customer has no matching payment attempts.
   *
   * This operation is read-only. It must not create a new payment attempt, must not retry payment gateway processing, and must not create or modify shopping_mall_orders. The retry workflow is separate: a new payment attempt is created for each retry, and order creation occurs only after an individual attempt succeeds.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallPaymentAttempt.IRequest,
  ): Promise<IPageIShoppingMallPaymentAttempt.ISummary> {
    try {
      return await patchShoppingMallCustomerPaymentAttempts({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed record of a single payment attempt identified by `paymentAttemptId`.
   *
   * This operation returns the atomic payment-processing record captured during checkout for a customer’s reviewed purchase. In the underlying `shopping_mall_payment_attempts` table, a payment attempt is defined as a payment processing attempt initiated during customer checkout before an order is finalized. The record preserves both failed and successful outcomes so the platform can support payment troubleshooting, retry behavior, auditability of payment outcomes, and reconciliation with the external gateway. The response is therefore about the payment try itself rather than the completed purchase record.
   *
   * The operation reflects the business boundary described in the requirements: a payment attempt answers whether checkout payment succeeded or failed, while an order answers whether a confirmed purchase record exists. A successful attempt may permit downstream order creation, but a failed attempt remains only a failed payment processing attempt and does not become an order. Consumers of this API should not treat the existence of a payment attempt as proof that an order exists. Instead, the returned `status`, `processed_at`, and `failure_reason` fields communicate whether the gateway finished processing and what outcome was preserved.
   *
   * Security is ownership-sensitive. Each payment attempt belongs to one customer through `shopping_mall_customer_id`, which references `shopping_mall_customers.id`. For customer-facing use, access must be limited to the authenticated customer who initiated the checkout payment attempt. Platform administrators and super administrators may also read the record for oversight, support, and reconciliation purposes. Sellers should not use this endpoint to inspect unrelated customer payment attempts because payment attempts are not seller-owned fulfillment records.
   *
   * The returned data corresponds directly to the persisted attempt-level facts: the primary identifier `id`; the owning customer reference; the current `status`; the submitted `amount`; the `gateway_provider` used to process the attempt; the provider-issued `gateway_reference`; the optional `failure_reason` returned when processing does not succeed; and the lifecycle timestamps `processed_at`, `created_at`, `updated_at`, and `deleted_at`. These fields come from a table specifically designed to preserve attempt-level facts without denormalizing cart or order details, so callers that need purchase or shipment context should invoke the appropriate order-related APIs separately.
   *
   * This endpoint is commonly used after checkout confirmation and payment processing initiation. It is especially useful when a client needs to display whether a reviewed purchase completed successfully, remains unresolved, or failed with a gateway-provided reason. If a client needs to determine whether payment success led to actual order creation, that check should be performed through the corresponding order retrieval workflow after examining this payment attempt outcome.
   *
   * If the specified payment attempt does not exist, is not visible to the caller under ownership and platform-oversight rules, or has been removed from active access by lifecycle handling, the operation must reject the request without exposing another customer’s payment data. Error handling should clearly distinguish authorization failure from missing-record scenarios at the service layer while preserving privacy in externally visible responses.
   *
   * @param connection
   * @param paymentAttemptId Target payment attempt's ID
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implement a read-only service method that loads
     *   one record from `shopping_mall_payment_attempts` by primary key `id`
     *   using the `paymentAttemptId` path parameter.
   *
   * Before returning data, enforce authorization based on actor context. If the caller is a customer, require an authenticated customer session and verify that `shopping_mall_payment_attempts.shopping_mall_customer_id` matches the authenticated customer’s identifier. If the caller is an administrator or super administrator, allow access for oversight and support workflows. Do not allow seller access unless a separate explicit platform policy exists outside this operation. When the caller is unauthenticated or fails the ownership check, reject the request.
   *
   * Query the single payment attempt record without mutating state. The selected fields should map directly to the DTO for `IShoppingMallPaymentAttempt`, including `id`, `shopping_mall_customer_id`, `status`, `amount`, `gateway_provider`, `gateway_reference`, `failure_reason`, `processed_at`, `created_at`, `updated_at`, and `deleted_at`. Preserve nullable behavior for `failure_reason`, `processed_at`, and `deleted_at` exactly as stored.
   *
   * Treat payment attempts as distinct from orders. Do not infer or synthesize order data in this operation. A successful payment attempt may lead to order creation through downstream business logic, but this endpoint must only report the preserved payment-attempt facts and outcome boundary. If later implementation needs related order lookup, that should remain a separate service concern or a different endpoint.
   *
   * For error handling, return a not-found style failure when no record exists for the specified `paymentAttemptId`. Return a forbidden or access-denied style failure when the caller is authenticated but does not own the record and lacks administrative oversight authority. Avoid leaking whether another customer’s payment attempt exists when authorization fails. No transaction is required beyond the consistency guarantees of a single read query.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":paymentAttemptId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("paymentAttemptId")
    paymentAttemptId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallPaymentAttempt> {
    try {
      return await getShoppingMallCustomerPaymentAttemptsPaymentAttemptId({
        customer,
        paymentAttemptId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the finalized processing state of a single payment attempt record.
   *
   * This operation manages one record in the shopping_mall_payment_attempts table, which is described as preserving both failed and successful checkout payment attempts initiated during customer checkout before an order is finalized. The underlying record stores atomic attempt-level facts rather than denormalized cart or order details, including the customer who initiated the attempt, the current payment result status, the total amount sent to the gateway, the external gateway provider name, the provider-issued reconciliation reference, an optional failure reason, and the time the gateway returned a final outcome. Updating this resource is therefore not a general profile-style edit; it is a controlled payment-processing update on a checkout event that may later lead to order creation.
   *
   * This operation is security-sensitive because the payment attempt outcome directly affects purchase flow progression. The requirements state that when a payment attempt succeeds, the platform shall create an order for the reviewed purchase, treat checkout as completed, and allow the purchase to proceed as an actual order. They also state that if the payment attempt outcome is failed, the platform shall not create the order. For that reason, this endpoint must only be available to trusted internal payment processing logic or authorized platform administrators performing reconciliation or exception handling. It must never be exposed as a customer self-service mechanism for altering payment results.
   *
   * The update applies only to mutable processing fields that reflect gateway completion and reconciliation state. Typical fields involved are the current result status, the provider-issued gateway reference when reconciliation data becomes available or needs correction, the failure reason when the attempt does not succeed, and the processed-at timestamp that marks when the external gateway returned a final outcome. The record belongs to one customer in shopping_mall_customers, but the ownership relation is historical context for the payment attempt and does not authorize that customer to edit the record. The amount submitted to the payment gateway represents the commercial value of the checkout attempt and should be treated as part of the preserved attempt fact pattern rather than freely editable business input.
   *
   * This endpoint is closely related to downstream order creation logic. A successful update to a terminal success state may be used by subsequent business processing to permit creation of an order and related purchased items, while a failed state must leave checkout without order creation. If the service architecture separates payment reconciliation from order generation, callers should ensure the appropriate downstream order-creation process is executed after a successful update. If order creation is handled transactionally within the same application service, the implementation must enforce idempotency so that repeated success notifications do not create duplicate orders for the same commercial checkout attempt.
   *
   * Expected error handling includes rejecting updates for nonexistent paymentAttemptId values, rejecting unauthorized callers, rejecting invalid state transitions, and rejecting attempts that would overwrite a previously finalized outcome in a way that violates gateway truth or business auditability. Validation must also prevent inconsistent combinations such as a succeeded status paired with a failure reason that indicates rejection, or a finalized outcome without an appropriate processed-at timestamp. The endpoint should preserve audit-quality history in created_at and updated_at semantics and should not be used to remove records from active storage.
   *
   * @param connection
   * @param paymentAttemptId Target payment attempt ID
   * @param body Updated payment attempt outcome information
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Load the target shopping_mall_payment_attempts
     *   row by id where deleted_at is null unless administrative recovery
     *   policies explicitly allow access to logically deleted records. Validate
     *   that the caller is a trusted internal payment-processing context or an
     *   authorized administrator. Do not allow customer-initiated or
     *   seller-initiated direct mutation of payment attempt outcome records.
   *
   * Apply a controlled update policy. Treat shopping_mall_customer_id as immutable after creation. Treat amount as immutable unless a narrowly defined reconciliation rule exists in the application layer; by default, reject amount replacement to preserve the original commercial attempt fact. Allow updates only to outcome-related and reconciliation-related fields such as status, gateway_provider, gateway_reference, failure_reason, and processed_at according to the request DTO contract. Always refresh updated_at in the service layer.
   *
   * Validate business consistency before persisting changes. Status must represent an allowed payment lifecycle value supported by the application. If the new status is a terminal success state, clear failure_reason, require or assign processed_at, and prepare downstream order-enablement logic. If the new status is a terminal failure state, keep order creation disallowed and allow failure_reason to store the gateway rejection detail. If the request attempts to move from a finalized truthful gateway result to a conflicting outcome, reject the update unless a privileged reconciliation workflow explicitly permits correction.
   *
   * After persisting the payment attempt update, coordinate downstream business effects. The requirements define successful payment as the condition that permits order creation and failed payment as a condition that must not create an order. Therefore, if status transitions into success, invoke idempotent order-creation orchestration for the reviewed checkout context or emit an internal domain event consumed by order creation. Ensure duplicate gateway callbacks or repeated PUT requests cannot create multiple orders from the same payment attempt. Use the unique gateway_provider plus gateway_reference pair for reconciliation safety where applicable.
   *
   * Return the updated payment attempt resource after persistence. For not-found ids, return a standard resource-missing error. For authorization failure, return a permission error. For invalid state transitions or inconsistent request data, return a validation error with a domain-specific reason. Log reconciliation-sensitive changes for audit review, especially when gateway references, processed outcomes, or failure details are modified.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":paymentAttemptId")
  public async update(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("paymentAttemptId")
    paymentAttemptId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallPaymentAttempt.IUpdate,
  ): Promise<IShoppingMallPaymentAttempt> {
    try {
      return await putShoppingMallCustomerPaymentAttemptsPaymentAttemptId({
        customer,
        paymentAttemptId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a specific payment attempt record by its identifier.
   *
   * This operation addresses the `shopping_mall_payment_attempts` entity, which the schema defines as payment processing attempts initiated during customer checkout before an order is finalized. In business terms, a payment attempt is part of the platform's commercial transaction trail: it records that a customer initiated payment processing for a potential purchase and, when successful, may be the boundary that results in creation of an order. Because orders, order history, and related preserved records must remain available for seller records, legal purposes, and historical accountability, deletion of a payment attempt must be treated as an exceptional governance action rather than a normal customer-facing capability.
   *
   * Access to this operation must therefore be restricted to elevated platform governance actors, specifically administrator or superAdministrator roles. Customers and sellers must not be allowed to remove payment-processing history because those records are not user-managed content. The caller must supply the exact `paymentAttemptId` path parameter, and the system must verify that the referenced payment attempt exists before attempting removal.
   *
   * This operation is tightly related to the order lifecycle. If the payment attempt has already resulted in an order, or if the attempt is still needed to explain checkout outcome, reconciliation state, fraud investigation, customer support review, or other preserved business evidence, the platform must reject the deletion request. The purpose of deletion here is limited to exceptional administrative cleanup of an orphaned or invalid payment-attempt record that is not required by downstream order, dispute, or audit history.
   *
   * Expected behavior includes strict validation and clear failure handling. The platform should return a not-found error when the identifier does not correspond to an existing payment attempt. It should return a forbidden or rejection error when the caller lacks administrative authority. It should also reject deletion when historical preservation obligations apply, especially when the payment attempt is linked to a created order or any other record that depends on the attempt as part of transaction accountability.
   *
   * @param connection
   * @param paymentAttemptId Unique identifier of the payment attempt to remove.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Locate the target row in
     *   `shopping_mall_payment_attempts` by primary identifier using
     *   `paymentAttemptId`.
   *
   * Authorize only administrator and superAdministrator actors. Reject any customer or seller caller before querying destructive logic.
   *
   * Before deletion, validate that the payment attempt is not associated with a finalized commercial record that must remain preserved. In particular, check whether the payment attempt has resulted in creation of an order or is referenced by any downstream reconciliation, support, dispute, or audit workflow implemented in the service. If such preservation conditions exist, reject the request without modifying data.
   *
   * If the target payment attempt does not exist, return a not-found error. If preservation rules block deletion, return a business-rule rejection describing that the payment attempt cannot be erased because it is required historical transaction evidence.
   *
   * If the record is eligible for removal, execute the delete in a transaction-safe manner so no partial cleanup occurs. Remove only the payment-attempt record itself and do not modify preserved orders or historical business records. Emit audit logging for the administrative erase action, including actor identity, target identifier, and timestamp, because this is a destructive governance operation on transactional history.
   *
   * Return success with no response body after the delete completes.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":paymentAttemptId")
  public async erase(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("paymentAttemptId")
    paymentAttemptId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallCustomerPaymentAttemptsPaymentAttemptId({
        customer,
        paymentAttemptId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
