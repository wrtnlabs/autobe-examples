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
 * Test complete payment update workflow including prerequisite payment
 * creation.
 *
 * This E2E test validates that administrators can successfully update payment
 * records with modified payment method, gateway, transaction ID, status,
 * authorization code, and refund amount. The test ensures financial integrity
 * and proper audit trail maintenance throughout the payment lifecycle.
 *
 * Workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create initial payment record with authorized status
 * 3. Update payment with comprehensive modifications
 * 4. Validate all updates are properly applied
 * 5. Verify captured_at timestamp handling during status transitions
 */
export async function test_api_payment_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
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
  typia.assert(adminJoinResponse);

  // Step 2: Authenticate as administrator
  const adminLoginResponse = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shopping-mall-admin.example.com",
      referrer: "https://shopping-mall.example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(adminLoginResponse);

  // Step 3: Create a payment record for testing
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const initialPaymentData = {
    payment_method: "credit_card" as const,
    payment_gateway: "Stripe",
    transaction_id: `txn_${RandomGenerator.alphaNumeric(14)}`,
    amount: typia.random<number & tags.Minimum<100> & tags.Maximum<5000>>(),
    currency: "USD",
    status: "authorized" as const,
    authorization_code: `auth_${RandomGenerator.alphaNumeric(10)}`,
    payment_details: JSON.stringify({
      card_last4: "4242",
      card_brand: "visa",
      exp_month: 12,
      exp_year: 2025,
    }),
  } satisfies IShoppingMallPayment.ICreate;

  const createdPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: initialPaymentData,
    });
  typia.assert(createdPayment);

  // Step 4: Update the payment with comprehensive modifications
  const updateData = {
    payment_method: "paypal" as const,
    payment_gateway: "PayPal",
    transaction_id: `pp_txn_${RandomGenerator.alphaNumeric(12)}`,
    status: "captured" as const,
    authorization_code: `pp_auth_${RandomGenerator.alphaNumeric(8)}`,
    captured_at: new Date().toISOString(),
    refunded_amount: 0,
  } satisfies IShoppingMallPayment.IUpdate;

  const updatedPayment =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: orderId,
      paymentId: createdPayment.id,
      body: updateData,
    });
  typia.assert(updatedPayment);

  // Step 5: Validate all updates were applied correctly
  TestValidator.equals(
    "payment method updated",
    updatedPayment.payment_method,
    "paypal",
  );
  TestValidator.equals(
    "payment gateway updated",
    updatedPayment.payment_gateway,
    "PayPal",
  );
  TestValidator.equals(
    "transaction ID updated",
    updatedPayment.transaction_id,
    updateData.transaction_id,
  );
  TestValidator.equals(
    "status updated to captured",
    updatedPayment.status,
    "captured",
  );
  TestValidator.equals(
    "authorization code updated",
    updatedPayment.authorization_code,
    updateData.authorization_code,
  );
  TestValidator.equals(
    "refunded amount set to zero",
    updatedPayment.refunded_amount,
    0,
  );

  // Validate captured_at timestamp is properly set and formatted
  TestValidator.predicate(
    "captured_at timestamp is set",
    updatedPayment.captured_at !== null &&
      updatedPayment.captured_at !== undefined,
  );

  if (updatedPayment.captured_at) {
    TestValidator.predicate(
      "captured_at is valid ISO string",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(
        updatedPayment.captured_at,
      ),
    );
  }

  // Validate that immutable properties remain unchanged
  TestValidator.equals(
    "payment ID remains unchanged",
    updatedPayment.id,
    createdPayment.id,
  );
  TestValidator.equals(
    "amount remains unchanged",
    updatedPayment.amount,
    createdPayment.amount,
  );
  TestValidator.equals(
    "currency remains unchanged",
    updatedPayment.currency,
    createdPayment.currency,
  );

  // Handle optional order reference validation
  if (updatedPayment.order) {
    TestValidator.equals(
      "order ID remains unchanged",
      updatedPayment.order.id,
      orderId,
    );
  }

  // Validate timestamp updates
  TestValidator.predicate(
    "updated_at timestamp is newer than created_at",
    new Date(updatedPayment.updated_at) > new Date(createdPayment.created_at),
  );
}
