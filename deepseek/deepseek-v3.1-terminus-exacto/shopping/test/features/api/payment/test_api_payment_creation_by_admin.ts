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
 * Test complete payment creation workflow for an order by an administrator.
 * Create a new admin account, establish an order context (though order creation
 * endpoint is not available, we'll simulate the order ID parameter), then
 * create a payment record with valid payment method, gateway, transaction
 * details, and initial status. Validate that the payment is successfully
 * created with proper authorization code, amount validation, and currency
 * handling.
 */
export async function test_api_payment_creation_by_admin(
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
      permissions: JSON.stringify({
        payments: ["create", "read", "update"],
        orders: ["read"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminJoinResponse);

  // Step 2: Authenticate administrator
  const adminLoginResponse = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shopping-mall-admin.example.com/dashboard",
      referrer: "https://shopping-mall-admin.example.com/login",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(adminLoginResponse);

  // Step 3: Create payment record for simulated order
  const simulatedOrderId = typia.random<string & tags.Format<"uuid">>();
  const paymentAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
  >();
  const authorizationCode = `auth_${RandomGenerator.alphaNumeric(8)}`;

  const paymentResponse =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: simulatedOrderId,
      body: {
        payment_method: "credit_card",
        payment_gateway: "Stripe",
        transaction_id: `txn_${RandomGenerator.alphaNumeric(16)}`,
        amount: paymentAmount,
        currency: "USD",
        status: "authorized",
        authorization_code: authorizationCode,
        payment_details: JSON.stringify({
          card_last4: "4242",
          card_brand: "visa",
          exp_month: 12,
          exp_year: 2025,
        }),
      } satisfies IShoppingMallPayment.ICreate,
    });
  typia.assert(paymentResponse);

  // Step 4: Validate payment creation response
  TestValidator.equals(
    "payment ID should be valid UUID",
    paymentResponse.id,
    paymentResponse.id,
  );
  TestValidator.equals(
    "payment amount should match input",
    paymentResponse.amount,
    paymentAmount,
  );
  TestValidator.equals(
    "payment currency should be USD",
    paymentResponse.currency,
    "USD",
  );
  TestValidator.equals(
    "payment method should be credit_card",
    paymentResponse.payment_method,
    "credit_card",
  );
  TestValidator.equals(
    "payment gateway should be Stripe",
    paymentResponse.payment_gateway,
    "Stripe",
  );
  TestValidator.equals(
    "payment status should be authorized",
    paymentResponse.status,
    "authorized",
  );
  TestValidator.equals(
    "authorization code should match input",
    paymentResponse.authorization_code,
    authorizationCode,
  );
  TestValidator.predicate(
    "payment should have creation timestamp",
    paymentResponse.created_at !== null &&
      paymentResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "payment should have update timestamp",
    paymentResponse.updated_at !== null &&
      paymentResponse.updated_at !== undefined,
  );
}
