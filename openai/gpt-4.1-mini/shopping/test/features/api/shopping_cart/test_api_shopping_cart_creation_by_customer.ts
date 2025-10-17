import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

/**
 * This test verifies the process of creating a shopping cart for a newly
 * registered customer. It ensures the customer registration provides a valid
 * authorization token. Then it creates a shopping cart associated with that
 * customer. The test confirms the shopping cart links correctly to the customer
 * and has valid timestamps. Lastly, it checks that creating another cart with
 * the same customer ID fails to enforce uniqueness.
 */
export async function test_api_shopping_cart_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "StrongPass!23",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // Assert JWT token presence
  TestValidator.predicate(
    "customer has access token",
    !!customer.token?.access,
  );

  // 2. Create shopping cart for this customer
  const createCartBody = {
    shopping_mall_customer_id: customer.id,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      { body: createCartBody },
    );
  typia.assert(shoppingCart);

  // Validate created cart's customer ID matches
  TestValidator.equals(
    "shopping cart customer ID matches",
    shoppingCart.shopping_mall_customer_id!,
    customer.id,
  );

  // Validate cart timestamps
  TestValidator.predicate(
    "shopping cart has created_at timestamp",
    typeof shoppingCart.created_at === "string" &&
      shoppingCart.created_at.length > 0,
  );
  TestValidator.predicate(
    "shopping cart has updated_at timestamp",
    typeof shoppingCart.updated_at === "string" &&
      shoppingCart.updated_at.length > 0,
  );

  // 3. Check error on duplicate cart creation for same customer
  await TestValidator.error(
    "duplicate shopping cart creation should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.create(
        connection,
        {
          body: createCartBody,
        },
      );
    },
  );
}
