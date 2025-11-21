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
 * Test partial payment updates where only specific fields are modified.
 *
 * This E2E test validates that payment records can be updated with individual
 * field modifications without requiring complete payment reconfiguration. The
 * test creates an administrator account, authenticates it, creates a payment
 * record, and then tests updating specific fields independently.
 *
 * Key validation points:
 *
 * - Partial updates maintain unchanged fields
 * - System-generated fields like updated_at are properly updated
 * - Each field can be modified independently
 * - Payment integrity is maintained during partial updates
 */
export async function test_api_payment_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAccount = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        payment_management: true,
        order_management: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAccount);

  // 2. Authenticate administrator session
  const authenticatedAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(authenticatedAdmin);

  // 3. Create prerequisite payment record
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const initialPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: orderId,
      body: {
        payment_method: "credit_card",
        payment_gateway: "stripe",
        transaction_id: `txn_${RandomGenerator.alphaNumeric(16)}`,
        amount: 10000,
        currency: "USD",
        status: "authorized",
        authorization_code: "AUTH_123456",
        payment_details: JSON.stringify({
          card_last4: "4242",
          card_brand: "visa",
        }),
      } satisfies IShoppingMallPayment.ICreate,
    });
  typia.assert(initialPayment);

  // Store original values for comparison
  const originalPaymentMethod = initialPayment.payment_method;
  const originalPaymentGateway = initialPayment.payment_gateway;
  const originalStatus = initialPayment.status;
  const originalRefundedAmount = initialPayment.refunded_amount;
  const originalCreatedAt = initialPayment.created_at;

  // 4. Test updating payment_method field only
  const updatedPaymentMethod =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: orderId,
      paymentId: initialPayment.id,
      body: {
        payment_method: "paypal",
      } satisfies IShoppingMallPayment.IUpdate,
    });
  typia.assert(updatedPaymentMethod);

  TestValidator.equals(
    "payment_method should be updated",
    updatedPaymentMethod.payment_method,
    "paypal",
  );
  TestValidator.equals(
    "payment_gateway should remain unchanged",
    updatedPaymentMethod.payment_gateway,
    originalPaymentGateway,
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedPaymentMethod.status,
    originalStatus,
  );
  TestValidator.equals(
    "refunded_amount should remain unchanged",
    updatedPaymentMethod.refunded_amount,
    originalRefundedAmount,
  );
  TestValidator.notEquals(
    "updated_at should be different",
    updatedPaymentMethod.updated_at,
    initialPayment.updated_at,
  );

  // 5. Test updating payment_gateway field only
  const updatedPaymentGateway =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: orderId,
      paymentId: initialPayment.id,
      body: {
        payment_gateway: "paypal_api",
      } satisfies IShoppingMallPayment.IUpdate,
    });
  typia.assert(updatedPaymentGateway);

  TestValidator.equals(
    "payment_gateway should be updated",
    updatedPaymentGateway.payment_gateway,
    "paypal_api",
  );
  TestValidator.equals(
    "payment_method should remain unchanged",
    updatedPaymentGateway.payment_method,
    "paypal",
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedPaymentGateway.status,
    originalStatus,
  );
  TestValidator.equals(
    "refunded_amount should remain unchanged",
    updatedPaymentGateway.refunded_amount,
    originalRefundedAmount,
  );
  TestValidator.notEquals(
    "updated_at should be different from previous update",
    updatedPaymentGateway.updated_at,
    updatedPaymentMethod.updated_at,
  );

  // 6. Test updating status field only
  const updatedStatus =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: orderId,
      paymentId: initialPayment.id,
      body: {
        status: "captured",
      } satisfies IShoppingMallPayment.IUpdate,
    });
  typia.assert(updatedStatus);

  TestValidator.equals(
    "status should be updated",
    updatedStatus.status,
    "captured",
  );
  TestValidator.equals(
    "payment_method should remain unchanged",
    updatedStatus.payment_method,
    "paypal",
  );
  TestValidator.equals(
    "payment_gateway should remain unchanged",
    updatedStatus.payment_gateway,
    "paypal_api",
  );
  TestValidator.equals(
    "refunded_amount should remain unchanged",
    updatedStatus.refunded_amount,
    originalRefundedAmount,
  );
  TestValidator.notEquals(
    "updated_at should be different from previous update",
    updatedStatus.updated_at,
    updatedPaymentGateway.updated_at,
  );

  // 7. Test updating refunded_amount field only
  const updatedRefundAmount =
    await api.functional.shoppingMall.admin.orders.payments.update(connection, {
      orderId: orderId,
      paymentId: initialPayment.id,
      body: {
        refunded_amount: 5000,
      } satisfies IShoppingMallPayment.IUpdate,
    });
  typia.assert(updatedRefundAmount);

  TestValidator.equals(
    "refunded_amount should be updated",
    updatedRefundAmount.refunded_amount,
    5000,
  );
  TestValidator.equals(
    "payment_method should remain unchanged",
    updatedRefundAmount.payment_method,
    "paypal",
  );
  TestValidator.equals(
    "payment_gateway should remain unchanged",
    updatedRefundAmount.payment_gateway,
    "paypal_api",
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedRefundAmount.status,
    "captured",
  );
  TestValidator.notEquals(
    "updated_at should be different from previous update",
    updatedRefundAmount.updated_at,
    updatedStatus.updated_at,
  );

  // 8. Validate system-generated fields are properly maintained
  TestValidator.equals(
    "created_at should never change",
    updatedRefundAmount.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate("updated_at should be ISO date format", () => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      updatedRefundAmount.updated_at,
    );
  });

  // 9. Final validation - all partial updates should be cumulative
  TestValidator.equals(
    "final payment_method should reflect all updates",
    updatedRefundAmount.payment_method,
    "paypal",
  );
  TestValidator.equals(
    "final payment_gateway should reflect all updates",
    updatedRefundAmount.payment_gateway,
    "paypal_api",
  );
  TestValidator.equals(
    "final status should reflect all updates",
    updatedRefundAmount.status,
    "captured",
  );
  TestValidator.equals(
    "final refunded_amount should reflect all updates",
    updatedRefundAmount.refunded_amount,
    5000,
  );
}
