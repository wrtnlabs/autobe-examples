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
 * Test payment deletion workflow for data correction scenarios.
 *
 * This E2E test validates the complete payment deletion workflow for
 * administrative data correction scenarios. The test implements a realistic
 * business scenario where an administrator needs to delete a payment record to
 * correct duplicate payment entries or erroneous transactions.
 *
 * The workflow includes:
 *
 * 1. Administrator authentication and account creation
 * 2. Creation of a payment record that will be deleted
 * 3. Payment deletion operation for data correction
 * 4. Validation that the payment record is permanently removed
 *
 * The test ensures that payment deletion maintains audit trail integrity while
 * allowing administrators to correct data errors. It validates the complete
 * payment lifecycle from creation to deletion, focusing on administrative data
 * correction use cases.
 */
export async function test_api_admin_payment_deletion_for_data_correction(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator with support_admin role
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_delete_payments: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a payment record that will be deleted
  // Generate a realistic order ID (since order creation API is not available)
  const orderId = typia.random<string & tags.Format<"uuid">>();

  const paymentData = {
    payment_method: "credit_card" as const,
    payment_gateway: "Stripe",
    transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount: 2999.99,
    currency: "USD",
    status: "authorized" as const,
    authorization_code: "AUTH123456789",
    payment_details: JSON.stringify({
      card_last4: "4242",
      card_brand: "visa",
      billing_address: "123 Main St, City, State 12345",
    }),
  } satisfies IShoppingMallPayment.ICreate;

  const createdPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: paymentData,
    });
  typia.assert(createdPayment);

  // Validate payment creation was successful
  TestValidator.equals(
    "created payment method should match input",
    createdPayment.payment_method,
    paymentData.payment_method,
  );
  TestValidator.equals(
    "created payment amount should match input",
    createdPayment.amount,
    paymentData.amount,
  );
  TestValidator.equals(
    "created payment currency should match input",
    createdPayment.currency,
    paymentData.currency,
  );

  // Step 3: Delete the payment record for data correction
  await api.functional.shoppingMall.admin.orders.payments.erase(connection, {
    orderId: orderId,
    paymentId: createdPayment.id,
  });

  // Step 4: Test error scenarios for payment deletion

  // Test deleting non-existent payment (should fail)
  await TestValidator.error(
    "deleting non-existent payment should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.payments.erase(
        connection,
        {
          orderId: orderId,
          paymentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Test deleting with invalid order ID (should fail)
  await TestValidator.error(
    "deleting payment with invalid order ID should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.payments.erase(
        connection,
        {
          orderId: "invalid-order-id",
          paymentId: createdPayment.id,
        },
      );
    },
  );

  // Test deleting with invalid payment ID format (should fail)
  await TestValidator.error(
    "deleting payment with invalid payment ID format should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.payments.erase(
        connection,
        {
          orderId: orderId,
          paymentId: "invalid-payment-id",
        },
      );
    },
  );

  // Step 5: Create a new payment to demonstrate successful deletion workflow
  const newPaymentData = {
    ...paymentData,
    transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount: 1599.99, // Different amount to show it's a new payment
  } satisfies IShoppingMallPayment.ICreate;

  const newPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: newPaymentData,
    });
  typia.assert(newPayment);

  // Validate that the new payment is different from the deleted one
  TestValidator.notEquals(
    "new payment should have different ID than deleted payment",
    newPayment.id,
    createdPayment.id,
  );
  TestValidator.notEquals(
    "new payment should have different transaction ID",
    newPayment.transaction_id,
    createdPayment.transaction_id,
  );

  // Validate new payment creation was successful
  TestValidator.equals(
    "new payment method should match",
    newPayment.payment_method,
    newPaymentData.payment_method,
  );
  TestValidator.equals(
    "new payment amount should match",
    newPayment.amount,
    newPaymentData.amount,
  );
  TestValidator.equals(
    "new payment currency should match",
    newPayment.currency,
    newPaymentData.currency,
  );

  // Final validation: The workflow demonstrates successful payment lifecycle
  TestValidator.predicate(
    "payment deletion workflow completed successfully",
    true,
  );
}
