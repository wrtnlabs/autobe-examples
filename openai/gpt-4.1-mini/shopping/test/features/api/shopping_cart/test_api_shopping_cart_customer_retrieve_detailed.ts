import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

/**
 * E2E test function to verify authorized customer can create and retrieve their
 * own shopping cart details.
 *
 * 1. Registers a new customer with random unique email and password.
 * 2. Creates a new shopping cart for the authenticated customer.
 * 3. Retrieves detailed information of the newly created shopping cart by ID.
 * 4. Validates the retrieved shopping cart ID matches created cart ID.
 * 5. Verifies the customer ID linked to the retrieved cart matches the
 *    authenticated customer.
 */
export async function test_api_shopping_cart_customer_retrieve_detailed(
  connection: api.IConnection,
) {
  // 1. Customer Registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "StrongPassword123!";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Create Shopping Cart for Registered Customer
  const createCartBody = {
    shopping_mall_customer_id: customer.id,
    session_id: null,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: createCartBody,
      },
    );
  typia.assert(shoppingCart);

  // 3. Retrieve Shopping Cart Details by ID
  const retrivedCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.at(connection, {
      shoppingCartId: shoppingCart.id,
    });
  typia.assert(retrivedCart);

  // 4. Validate Retrieved Cart matches Created Cart
  TestValidator.equals(
    "shopping cart ID should match",
    retrivedCart.id,
    shoppingCart.id,
  );

  // 5. Validate Customer ID on Cart matches Authenticated Customer
  TestValidator.equals(
    "shopping cart customer ID should match",
    retrivedCart.shopping_mall_customer_id,
    customer.id,
  );
}
