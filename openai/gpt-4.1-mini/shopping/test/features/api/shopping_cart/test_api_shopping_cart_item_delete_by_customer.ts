import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * This test verifies the deletion of an item from a shopping cart by an
 * authenticated customer.
 *
 * It performs the following steps:
 *
 * 1. Register a new customer account via the customer join API.
 * 2. Attempt to delete a shopping cart item with a valid UUID cartId and itemId,
 *    expecting no errors.
 * 3. Attempt to delete using a different unauthenticated connection, expecting
 *    authorization error.
 *
 * The test ensures only the rightful owner can delete items and invalid
 * deletions are rejected.
 */
export async function test_api_shopping_cart_item_delete_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer to authenticate
  const customerCreateBody = {
    email: `test_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Test1234!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Attempt deletion of a cart item with generated valid UUIDs
  const validCartId = typia.random<string & tags.Format<"uuid">>();
  const validItemId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.shoppingMall.customer.shoppingCarts.items.eraseCartItem(
    connection,
    {
      cartId: validCartId,
      itemId: validItemId,
    },
  );

  // 3. Attempt deletion with unauthenticated connection expecting authorization error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated user cannot delete cart item",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.items.eraseCartItem(
        unauthenticatedConnection,
        {
          cartId: validCartId,
          itemId: validItemId,
        },
      );
    },
  );
}
