import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_cart_delete_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up to get authenticated and authorized
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a shopping cart using the same customer's token by simulating or calling another function hypothetically
  // Since no create shopping cart API provided, simulate shopping cart id
  const shoppingCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Delete the shopping cart as owning customer
  await api.functional.shoppingMall.customer.shoppingCarts.erase(connection, {
    id: shoppingCartId,
  });

  // 4. Attempt to delete the same cart again to verify error on non-existent cart
  await TestValidator.error(
    "deleting non-existent shopping cart should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.erase(
        connection,
        {
          id: shoppingCartId,
        },
      );
    },
  );

  // 5. Attempt to delete a shopping cart with a random UUID to check unauthorized or not found
  const randomCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting random non-existent shopping cart should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.erase(
        connection,
        {
          id: randomCartId,
        },
      );
    },
  );
}
