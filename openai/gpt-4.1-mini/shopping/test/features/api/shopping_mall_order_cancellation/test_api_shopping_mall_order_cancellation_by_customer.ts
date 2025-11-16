import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";

/**
 * Verify a customer can register and submit an order cancellation request.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new shopping mall customer account with valid email, password,
 *    and full name.
 * 2. Authenticates the newly registered customer and validates the authorization
 *    response.
 * 3. Creates a new order cancellation request on behalf of the authenticated
 *    customer.
 *
 *    - Provides a valid order ID with appropriate format.
 *    - Optionally includes a cancellation reason.
 *    - Sets the initial cancellation status as 'pending'.
 * 4. Validates the cancellation creation response structure and fields.
 * 5. Ensures that the cancellation's status is 'pending' and the customer ID
 *    matches the authenticated customer.
 * 6. Confirms all date-time stamps are valid ISO 8601 formatted strings.
 */
export async function test_api_shopping_mall_order_cancellation_by_customer(
  connection: api.IConnection,
) {
  // 1. Generate random customer registration data
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerCreateBody = {
    email: customerEmail,
    password: "P@s5word!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;

  // 2. Register the new customer and obtain authorization
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 3. Prepare order cancellation create data
  // Since the test scenario doesn't provide an actual order, generate a realistic UUID
  const orderCancellationCreateBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Customer changed mind",
    status: "pending",
  } satisfies IShoppingMallOrderCancellation.ICreate;

  // 4. Create the order cancellation request as authenticated customer
  const cancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.customer.shoppingMallOrderCancellations.create(
      connection,
      {
        body: orderCancellationCreateBody,
      },
    );

  // 5. Validate the response
  typia.assert(cancellation);

  // 6. Verify that the cancellation status is 'pending'
  TestValidator.equals(
    "order cancellation status should be pending",
    cancellation.status,
    "pending",
  );

  // 7. Verify that the cancellation is linked to the correct customer id
  TestValidator.equals(
    "order cancellation customer id match",
    cancellation.shopping_mall_customer_id,
    customer.id,
  );

  // 8. Check all datetime fields are valid ISO 8601 strings
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    typeof cancellation.created_at === "string" &&
      !isNaN(Date.parse(cancellation.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    typeof cancellation.updated_at === "string" &&
      !isNaN(Date.parse(cancellation.updated_at)),
  );

  // 9. deleted_at can be null or undefined, verify either
  TestValidator.predicate(
    "deleted_at is null or undefined",
    cancellation.deleted_at === null || cancellation.deleted_at === undefined,
  );
}
