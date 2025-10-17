import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

/**
 * Validate shopping cart deletion flow by an authenticated customer.
 *
 * This test covers:
 *
 * 1. Customer registration and authentication via POST /auth/customer/join
 * 2. Shopping cart creation linked to the authenticated customer
 * 3. Shopping cart deletion by ID
 *
 * Steps:
 *
 * - Register a new customer using realistic email and password.
 * - Create a shopping cart associated with the authenticated customer.
 * - Delete the created shopping cart by its unique ID.
 *
 * Assertions:
 *
 * - Each API response is verified with typia.assert for strict type safety.
 * - The deletion API does not throw errors, confirming authorization and success.
 *
 * This test assures that only authenticated customers can manage their own
 * shopping carts, enforcing access control and data integrity within the
 * shopping mall platform.
 */
export async function test_api_shopping_cart_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer.
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "P@ssw0rd1234", // Using a secure example password
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Create a shopping cart for the authenticated customer.
  // Provide the customer's ID as shopping_mall_customer_id property.
  const createBody = {
    shopping_mall_customer_id: customer.id,
    session_id: null,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(shoppingCart);

  // 3. Delete the created shopping cart by ID.
  await api.functional.shoppingMall.customer.shoppingCarts.erase(connection, {
    shoppingCartId: shoppingCart.id,
  });
}
