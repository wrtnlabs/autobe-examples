import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

/**
 * Test payment status transitions through the complete lifecycle.
 *
 * This E2E test validates the complete payment workflow by simulating status
 * transitions from pending to authorized, then to captured, and finally to
 * refunded states. The test ensures that business rules are properly enforced,
 * timestamps are correctly set, and refund amounts are accurately tracked.
 */
export async function test_api_payment_update_status_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ read: true, write: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Login as administrator to establish authenticated session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.shoppingmall.com/dashboard",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 3: Create a payment record with initial 'pending' status
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const paymentAmount = 5000; // Fixed amount for consistent testing

  const initialPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: {
        payment_method: "credit_card",
        payment_gateway: "stripe",
        transaction_id: `txn_${RandomGenerator.alphaNumeric(16)}`,
        amount: paymentAmount,
        currency: "USD",
        status: "pending",
        authorization_code: undefined,
        payment_details: JSON.stringify({
          card_last4: "4242",
          card_brand: "visa",
        }),
      } satisfies IShoppingMallPayment.ICreate,
    });
  typia.assert(initialPayment);
  TestValidator.equals(
    "payment should be created with pending status",
    initialPayment.status,
    "pending",
  );

  // Step 4: Update status from pending to authorized
  const authorizedPayment =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: orderId,
      paymentId: initialPayment.id,
      body: {
        status: "authorized",
        authorization_code: `auth_${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IShoppingMallPayment.IUpdate,
    });
  typia.assert(authorizedPayment);
  TestValidator.equals(
    "payment status should be authorized",
    authorizedPayment.status,
    "authorized",
  );
  TestValidator.notEquals(
    "authorization code should be set",
    authorizedPayment.authorization_code,
    undefined,
  );

  // Step 5: Update status from authorized to captured with timestamp
  const capturedPayment =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: orderId,
      paymentId: initialPayment.id,
      body: {
        status: "captured",
        captured_at: new Date().toISOString(),
      } satisfies IShoppingMallPayment.IUpdate,
    });
  typia.assert(capturedPayment);
  TestValidator.equals(
    "payment status should be captured",
    capturedPayment.status,
    "captured",
  );
  TestValidator.notEquals(
    "captured_at timestamp should be set",
    capturedPayment.captured_at,
    undefined,
  );

  // Step 6: Update status from captured to refunded with partial refund
  const refundAmount = 2500; // 50% refund as integer
  const refundedPayment =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: orderId,
      paymentId: initialPayment.id,
      body: {
        status: "refunded",
        refunded_amount: refundAmount,
      } satisfies IShoppingMallPayment.IUpdate,
    });
  typia.assert(refundedPayment);
  TestValidator.equals(
    "payment status should be refunded",
    refundedPayment.status,
    "refunded",
  );
  TestValidator.equals(
    "refunded amount should match",
    refundedPayment.refunded_amount,
    refundAmount,
  );

  // Step 7: Validate the complete payment lifecycle
  TestValidator.equals(
    "payment ID should remain consistent throughout lifecycle",
    initialPayment.id,
    authorizedPayment.id,
  );
  TestValidator.equals(
    "payment ID should remain consistent throughout lifecycle",
    authorizedPayment.id,
    capturedPayment.id,
  );
  TestValidator.equals(
    "payment ID should remain consistent throughout lifecycle",
    capturedPayment.id,
    refundedPayment.id,
  );

  TestValidator.equals(
    "payment amount should remain unchanged",
    refundedPayment.amount,
    paymentAmount,
  );
  TestValidator.equals(
    "payment currency should remain unchanged",
    refundedPayment.currency,
    "USD",
  );
  TestValidator.equals(
    "payment method should remain unchanged",
    refundedPayment.payment_method,
    "credit_card",
  );
  TestValidator.equals(
    "payment gateway should remain unchanged",
    refundedPayment.payment_gateway,
    "stripe",
  );
}
