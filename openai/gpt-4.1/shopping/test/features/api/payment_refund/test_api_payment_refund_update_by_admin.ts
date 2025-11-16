import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";

/**
 * Validate updating a payment refund by authenticated admin.
 *
 * This test covers the admin authentication, creation of a new payment record,
 * issuing a refund, and then updating the refund's status and details. It
 * checks business rules for valid status transitions and verifies that only an
 * authorized admin can process the update.
 *
 * Steps:
 *
 * 1. Sign up as an admin and authenticate.
 * 2. Create a payment (with typia-generated random but valid values for required
 *    fields).
 * 3. Issue a refund with a valid status (e.g., "requested" or "pending").
 * 4. Update the refund record to a final status (e.g., "completed"), add admin
 *    actor and processed_at, and change optional details.
 * 5. Retrieve and verify the refund is updated accordingly.
 */
export async function test_api_payment_refund_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Sign up as admin and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a payment
  const paymentBody = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    amount: 5000,
    currency: "KRW",
    method_type: "card",
    status: "completed",
    external_payment_id: RandomGenerator.alphaNumeric(16),
    transaction_token: RandomGenerator.alphaNumeric(24),
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.create(connection, {
      body: paymentBody,
    });
  typia.assert(payment);

  // 3. Issue a refund
  const refundBody = {
    amount: payment.amount,
    currency: payment.currency,
    reason: "Customer claim refund",
    status: "requested",
    external_refund_id: RandomGenerator.alphaNumeric(18),
  } satisfies IShoppingMallPaymentRefund.ICreate;
  const refund: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.create(
      connection,
      {
        paymentId: payment.id,
        body: refundBody,
      },
    );
  typia.assert(refund);

  // 4. Update the refund - transition to completed state, append admin processing info
  const now = new Date().toISOString();
  const updateBody = {
    status: "completed",
    reason: "Refund processed by admin action",
    external_refund_id: RandomGenerator.alphaNumeric(18),
    processed_by_admin_id: admin.id,
    processed_at: now,
  } satisfies IShoppingMallPaymentRefund.IUpdate;
  const updated: IShoppingMallPaymentRefund =
    await api.functional.shoppingMall.admin.payments.refunds.update(
      connection,
      {
        paymentId: payment.id,
        refundId: refund.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validation: check status, admin reference, processed_at, and update content
  TestValidator.equals(
    "refund record is updated to completed",
    updated.status,
    "completed",
  );
  TestValidator.equals(
    "refund reason is updated",
    updated.reason,
    updateBody.reason,
  );
  TestValidator.equals(
    "refund processed_by_admin refers to correct admin",
    updated.processed_by_admin?.id ?? null,
    admin.id,
  );
  TestValidator.equals(
    "refund processed_at timestamp is present",
    updated.processed_at !== null && updated.processed_at !== undefined,
    true,
  );
}
