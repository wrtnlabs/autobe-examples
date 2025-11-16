import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";

/**
 * Test the retrieval of a customer's own shopping mall order cancellation
 * details.
 *
 * This End-to-End test follows these steps:
 *
 * 1. Create a new customer account by invoking /auth/customer/join.
 * 2. Using authenticated context, create a new shopping mall order cancellation
 *    via POST /shoppingMall/customer/shoppingMallOrderCancellations. The
 *    cancellation request will include a valid shopping mall order ID and a
 *    cancellation reason.
 * 3. Retrieve the cancellation details using GET
 *    /shoppingMall/customer/shoppingMallOrderCancellations/{shoppingMallOrderCancellationId}.
 * 4. Verify the retrieved cancellation details match the created cancellation.
 * 5. Assert that unauthorized access is prevented by attempting retrieval with an
 *    unauthenticated connection.
 */
export async function test_api_customer_retrieve_own_order_cancellation_details(
  connection: api.IConnection,
) {
  // Step 1: Customer registration and authentication
  const customerCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "ValidPass123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // Step 2: Create a shopping mall order cancellation
  // Note: shopping_mall_order_id must be a valid uuid. Since order creation is not
  // described or available in the materials, generate a realistic UUID to simulate.
  // The status is required; set to 'pending' as typical initial status.
  const cancellationCreateBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Customer no longer wants the item",
    status: "pending",
  } satisfies IShoppingMallOrderCancellation.ICreate;
  const cancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.customer.shoppingMallOrderCancellations.create(
      connection,
      {
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellation);

  // Step 3: Retrieve the created cancellation by ID
  const retrieved: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.customer.shoppingMallOrderCancellations.at(
      connection,
      {
        shoppingMallOrderCancellationId: cancellation.id,
      },
    );
  typia.assert(retrieved);

  // Step 4: Verify that retrieved data matches created cancellation
  TestValidator.equals(
    "retrieved cancellation id matches created",
    retrieved.id,
    cancellation.id,
  );
  TestValidator.equals(
    "retrieved cancellation order id matches created",
    retrieved.shopping_mall_order_id,
    cancellation.shopping_mall_order_id,
  );
  TestValidator.equals(
    "retrieved cancellation customer id matches created",
    retrieved.shopping_mall_customer_id,
    cancellation.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "retrieved cancellation reason matches created",
    retrieved.reason ?? null,
    cancellation.reason ?? null,
  );
  TestValidator.equals(
    "retrieved cancellation status matches created",
    retrieved.status,
    cancellation.status,
  );

  // Step 5: Validate unauthorized access is forbidden
  // Create unauthorized connection by clearing auth headers
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access to cancellation details should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallOrderCancellations.at(
        unauthorizedConnection,
        {
          shoppingMallOrderCancellationId: cancellation.id,
        },
      );
    },
  );
}
