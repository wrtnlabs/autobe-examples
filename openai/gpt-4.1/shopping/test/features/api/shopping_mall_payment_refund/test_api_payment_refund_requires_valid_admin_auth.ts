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
 * Verify that creating a refund for a payment requires valid administrator
 * authentication.
 *
 * This test ensures the /shoppingMall/admin/payments/{paymentId}/refunds
 * endpoint denies refund creation requests when no admin is authenticated. The
 * test will:
 *
 * 1. Register a new admin
 * 2. Create a payment using the admin account
 * 3. Attempt to create a refund for the payment using an unauthenticated
 *    (tokenless) connection
 * 4. Assert that the refund creation fails with an error (due to missing or
 *    invalid authorization)
 *
 * Expected result: The refund creation operation should be denied with an
 * authorization error, and no refund is created.
 */
export async function test_api_payment_refund_requires_valid_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register an admin to execute privileged operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Use admin context to provision a payment (payment requires admin)
  const paymentPayload = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    amount: 10000,
    currency: "KRW",
    method_type: "card",
    status: "initiated",
    external_payment_id: RandomGenerator.alphaNumeric(16),
    transaction_token: RandomGenerator.alphaNumeric(24),
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const payment = await api.functional.shoppingMall.admin.payments.create(
    connection,
    {
      body: paymentPayload,
    },
  );
  typia.assert(payment);

  // 3. Attempt refund WITHOUT admin authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const refundPayload = {
    amount: payment.amount,
    currency: payment.currency,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: "requested",
    external_refund_id: RandomGenerator.alphaNumeric(14),
  } satisfies IShoppingMallPaymentRefund.ICreate;

  await TestValidator.error(
    "refund creation should fail without admin authentication",
    async () => {
      await api.functional.shoppingMall.admin.payments.refunds.create(
        unauthConn,
        {
          paymentId: payment.id,
          body: refundPayload,
        },
      );
    },
  );
}
