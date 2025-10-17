import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

/**
 * This E2E test verifies the creation of a shopping cart by a customer in a
 * shopping mall application.
 *
 * The test follows these steps:
 *
 * 1. Create a new customer with valid registration data to establish user entity.
 * 2. Authenticate as the created customer via the join endpoint to obtain JWT
 *    token and authorization context.
 * 3. Create a new shopping cart linked to the authenticated customer.
 * 4. Validate the response contains the shopping cart with correct linkage to
 *    customer and proper timestamps.
 * 5. Use typia.assert to ensure response type correctness and TestValidator
 *    utility for detailed field validation.
 *
 * This test ensures that only authenticated customers can create shopping
 * carts, the linkage via shopping_mall_customer_id is correct, and the
 * timestamps comply with ISO 8601 format. It validates successful business
 * logic execution for the shopping cart creation endpoint.
 */
export async function test_api_create_shopping_cart_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create a customer with valid registration data
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // Step 2: Authenticate as the created customer
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customer.email as string & tags.Format<"email">,
        password: customerCreateBody.password_hash,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(authorizedCustomer);

  // Step 3: Create a shopping cart linked to authenticated customer
  const shoppingCartCreateBody = {
    shopping_mall_customer_id: authorizedCustomer.id,
    session_id: null,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: shoppingCartCreateBody,
      },
    );
  typia.assert(shoppingCart);

  // Step 4: Validations
  TestValidator.equals(
    "shopping cart linked to correct customer",
    shoppingCart.shopping_mall_customer_id,
    authorizedCustomer.id,
  );
  TestValidator.predicate(
    "shopping cart ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      shoppingCart.id,
    ),
  );
  TestValidator.predicate(
    "shopping cart created_at has ISO date format",
    typeof shoppingCart.created_at === "string" &&
      !isNaN(Date.parse(shoppingCart.created_at)),
  );
  TestValidator.predicate(
    "shopping cart updated_at has ISO date format",
    typeof shoppingCart.updated_at === "string" &&
      !isNaN(Date.parse(shoppingCart.updated_at)),
  );
}
