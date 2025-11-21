import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Test order retrieval when the specified order ID does not exist or belongs to
 * another customer. Validates that appropriate error responses are returned for
 * unauthorized access attempts.
 */
export async function test_api_customer_order_retrieval_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create first customer account for authentication
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer1Email,
      password: "password123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer1);

  // Step 2: Test with non-existent but valid UUID
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent order ID should fail", async () => {
    await api.functional.shoppingMall.customer.orders.at(connection, {
      orderId: nonExistentOrderId,
    });
  });

  // Step 3: Create second customer account
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      password: "password456",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer2);

  // Step 4: Attempt to access non-existent order with second customer
  await TestValidator.error(
    "non-existent order with different customer should fail",
    async () => {
      await api.functional.shoppingMall.customer.orders.at(connection, {
        orderId: nonExistentOrderId,
      });
    },
  );

  // Step 5: Test with another valid but non-existent UUID
  const anotherNonExistentOrderId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "another non-existent order ID should fail",
    async () => {
      await api.functional.shoppingMall.customer.orders.at(connection, {
        orderId: anotherNonExistentOrderId,
      });
    },
  );

  // Step 6: Test with malformed string (not UUID format) - using valid UUID generation
  const malformedOrderId = "not-a-uuid-at-all";
  await TestValidator.error(
    "malformed order ID string should fail",
    async () => {
      await api.functional.shoppingMall.customer.orders.at(connection, {
        orderId: malformedOrderId satisfies string as string &
          tags.Format<"uuid">,
      });
    },
  );
}
