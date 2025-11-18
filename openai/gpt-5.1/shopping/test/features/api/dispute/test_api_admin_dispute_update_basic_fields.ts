import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_dispute_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Admin registration (acquire admin context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seller registration (multi-actor context; not used later in logic)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 3. Customer registration (multi-actor context; not used later in logic)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 4. Ensure we are in admin context for dispute operations
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  // 5. Create an initial dispute with simple header-only configuration
  const initialOpenedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const createDisputeBody = {
    dispute_code: null,
    type: "payment_issue",
    severity: "medium",
    summary: "Initial payment-related dispute",
    description:
      "Customer reported an issue with the payment but details are pending.",
    opened_at: initialOpenedAt,
    shopping_mall_order_id: null,
    shopping_mall_refund_request_id: null,
    shopping_mall_payment_chargeback_id: null,
    shopping_mall_risk_case_id: null,
  } satisfies IShoppingMallDispute.ICreate;

  const createdDispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: createDisputeBody,
    });
  typia.assert<IShoppingMallDispute>(createdDispute);

  // Capture immutable identifiers and relationships to compare after update
  const originalId = createdDispute.id;
  const originalCode = createdDispute.dispute_code;
  const originalOrderId = createdDispute.order_id ?? null;
  const originalRefundRequestId = createdDispute.refund_request_id ?? null;
  const originalPaymentChargebackId =
    createdDispute.payment_chargeback_id ?? null;
  const originalRiskCaseId = createdDispute.risk_case_id ?? null;
  const originalLegalHoldId = createdDispute.legal_hold_id ?? null;
  const originalOwnerAdminId = createdDispute.owner_admin_id ?? null;
  const originalCaseSlaConfigId = createdDispute.case_sla_config_id ?? null;
  const originalCreatedAt = createdDispute.created_at;
  const originalUpdatedAt = createdDispute.updated_at;

  // Sanity checks on created dispute
  TestValidator.predicate(
    "created dispute id must be non-empty",
    createdDispute.id.length > 0,
  );
  TestValidator.predicate(
    "created dispute code must be non-empty",
    createdDispute.dispute_code.length > 0,
  );

  // 6. Prepare update payload for mutable header fields
  const newSummary = "Updated dispute summary for resolution";
  const newDescription =
    "Investigation completed. Dispute resolved in favor of the customer.";

  const resolvedAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const closedAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 120 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    type: "refund_dispute",
    severity: "high",
    status: "resolved",
    summary: newSummary,
    description: newDescription,
    opened_at: initialOpenedAt,
    resolved_at: resolvedAt,
    closed_at: closedAt,
  } satisfies IShoppingMallDispute.IUpdate;

  const updatedDispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.update(connection, {
      disputeCode: originalCode,
      body: updateBody,
    });
  typia.assert<IShoppingMallDispute>(updatedDispute);

  // 7. Assert immutable identifiers have not changed
  TestValidator.equals(
    "dispute id must remain unchanged after update",
    updatedDispute.id,
    originalId,
  );
  TestValidator.equals(
    "dispute code must remain unchanged after update",
    updatedDispute.dispute_code,
    originalCode,
  );

  // 8. Assert mutable fields reflect updated values
  TestValidator.equals(
    "dispute type must be updated",
    updatedDispute.type,
    updateBody.type,
  );
  TestValidator.equals(
    "dispute severity must be updated",
    updatedDispute.severity,
    updateBody.severity,
  );
  TestValidator.equals(
    "dispute status must be updated",
    updatedDispute.status,
    updateBody.status,
  );
  TestValidator.equals(
    "dispute summary must be updated",
    updatedDispute.summary,
    updateBody.summary,
  );
  TestValidator.equals(
    "dispute description must be updated",
    updatedDispute.description,
    updateBody.description,
  );
  TestValidator.equals(
    "dispute opened_at must match the original value we kept",
    updatedDispute.opened_at,
    updateBody.opened_at,
  );
  TestValidator.equals(
    "dispute resolved_at must match updated value",
    updatedDispute.resolved_at,
    updateBody.resolved_at,
  );
  TestValidator.equals(
    "dispute closed_at must match updated value",
    updatedDispute.closed_at,
    updateBody.closed_at,
  );

  // 9. Assert relational identifiers remain unchanged
  TestValidator.equals(
    "order relation must remain unchanged",
    updatedDispute.order_id ?? null,
    originalOrderId,
  );
  TestValidator.equals(
    "refund request relation must remain unchanged",
    updatedDispute.refund_request_id ?? null,
    originalRefundRequestId,
  );
  TestValidator.equals(
    "payment chargeback relation must remain unchanged",
    updatedDispute.payment_chargeback_id ?? null,
    originalPaymentChargebackId,
  );
  TestValidator.equals(
    "risk case relation must remain unchanged",
    updatedDispute.risk_case_id ?? null,
    originalRiskCaseId,
  );
  TestValidator.equals(
    "legal hold relation must remain unchanged",
    updatedDispute.legal_hold_id ?? null,
    originalLegalHoldId,
  );
  TestValidator.equals(
    "owner admin relation must remain unchanged",
    updatedDispute.owner_admin_id ?? null,
    originalOwnerAdminId,
  );
  TestValidator.equals(
    "case SLA config relation must remain unchanged",
    updatedDispute.case_sla_config_id ?? null,
    originalCaseSlaConfigId,
  );

  // 10. Assert audit timestamps behavior
  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedDispute.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at must advance after update",
    updatedDispute.updated_at > originalUpdatedAt,
  );
}
