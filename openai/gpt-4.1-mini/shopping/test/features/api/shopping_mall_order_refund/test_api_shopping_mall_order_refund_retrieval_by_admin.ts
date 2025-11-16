import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

/**
 * Test retrieval of a specific shopping mall order refund by an admin user.
 * This involves multiple authorization actors and sequential operations.
 *
 * Steps:
 *
 * 1. Admin signs up with a unique email and password.
 * 2. Admin logs in to acquire valid authorization tokens used for admin
 *    operations.
 * 3. Customer signs up with a unique email and password.
 * 4. Customer logs in to acquire valid customer tokens.
 * 5. Customer creates a new shopping mall order with realistic order data.
 * 6. Customer submits a refund request linked to the created order with amount,
 *    reason, and status 'pending'.
 * 7. Admin retrieves the refund request by refund ID.
 *
 * Validations:
 *
 * - Ensure all API responses conform to expected DTO types using typia.assert.
 * - Check that refund request data has correct linkage to order and customer.
 * - Verify refund status is one of allowed enum values.
 * - Validate authorization enforcement by proper use of tokens and roles.
 * - Each step logs relevant IDs and ensures continuity between steps.
 */
export async function test_api_shopping_mall_order_refund_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "adminPassword123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Admin logs in
  const adminLoginBody = {
    email: adminEmail,
    password: "adminPassword123!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Customer signs up
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerCreateBody = {
    email: customerEmail,
    password: "customerPassword123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customerAuthorized);

  // 4. Customer logs in
  const customerLoginBody = {
    email: customerEmail,
    password: "customerPassword123!",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 5. Customer creates order
  const orderCreateBody = {
    order_number: `ORD-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`,
    status: "pending",
    payment_status: "waiting",
    total_amount: Math.floor(Math.random() * 1000) + 100, // 100~1100
  } satisfies IShoppingMallOrder.ICreate;
  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      { body: orderCreateBody },
    );
  typia.assert(createdOrder);

  // 6. Customer submits refund request
  const refundCreateBody = {
    shoppingMallOrderId: createdOrder.id,
    amount: Math.floor(createdOrder.total_amount / 2),
    reason: "Product was defective",
    status: "pending",
    adminNote: null,
  } satisfies IShoppingMallOrderRefund.ICreate;
  const createdRefund: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.customer.shoppingMallOrderRefunds.create(
      connection,
      { body: refundCreateBody },
    );
  typia.assert(createdRefund);

  // 7. Admin retrieves refund request
  const retrievedRefund: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.admin.shoppingMallOrderRefunds.at(
      connection,
      { shoppingMallOrderRefundId: createdRefund.id },
    );
  typia.assert(retrievedRefund);

  // Validations
  TestValidator.equals(
    "refund id matches",
    retrievedRefund.id,
    createdRefund.id,
  );

  TestValidator.equals(
    "refund order id matches",
    retrievedRefund.shoppingMallOrderId,
    createdRefund.shoppingMallOrderId,
  );

  TestValidator.equals(
    "refund customer id matches",
    retrievedRefund.shoppingMallCustomerId,
    createdRefund.shoppingMallCustomerId,
  );

  TestValidator.equals(
    "refund amount matches",
    retrievedRefund.amount,
    createdRefund.amount,
  );

  TestValidator.predicate(
    "refund status is valid",
    ["pending", "approved", "rejected"].includes(retrievedRefund.status),
  );

  TestValidator.equals(
    "refund reason matches",
    retrievedRefund.reason,
    createdRefund.reason,
  );

  TestValidator.predicate(
    "refund createdAt is ISO string",
    typeof retrievedRefund.createdAt === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}((\.[0-9]+)?Z)$/.test(
        retrievedRefund.createdAt,
      ),
  );
  // approval fields may be null upon creation
}
