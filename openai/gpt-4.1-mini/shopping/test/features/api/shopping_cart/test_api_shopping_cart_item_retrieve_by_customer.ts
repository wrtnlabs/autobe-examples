import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_cart_item_retrieve_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "p@ssW0rd",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Setup 'valid' cartId and itemId
  // Since cart/item creation APIs are not provided, we simulate UUIDs.
  // Realistically, these IDs need to correspond to existing records.
  const validCartId = typia.random<string & tags.Format<"uuid">>();
  const validItemId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve cart item with valid IDs
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.at(
      connection,
      {
        cartId: validCartId,
        itemId: validItemId,
      },
    );
  typia.assert(cartItem);

  // 4. Confirm that the returned record matches requested IDs
  TestValidator.equals(
    "cartId matches response",
    cartItem.shopping_mall_shopping_cart_id,
    validCartId,
  );
  TestValidator.equals("itemId matches response", cartItem.id, validItemId);

  // 5. Validate quantity is positive integer
  TestValidator.predicate("cart item quantity positive", cartItem.quantity > 0);

  // 6. Attempt to retrieve with different invalid cartId
  // Ensure invalidCartId differs from validCartId
  let invalidCartId: string;
  do {
    invalidCartId = typia.random<string & tags.Format<"uuid">>();
  } while (invalidCartId === validCartId);

  await TestValidator.error(
    "invalid cartId retrieval should throw",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.items.at(
        connection,
        {
          cartId: invalidCartId,
          itemId: validItemId,
        },
      );
    },
  );

  // 7. Attempt to retrieve with different invalid itemId
  // Ensure invalidItemId differs from validItemId
  let invalidItemId: string;
  do {
    invalidItemId = typia.random<string & tags.Format<"uuid">>();
  } while (invalidItemId === validItemId);

  await TestValidator.error(
    "invalid itemId retrieval should throw",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.items.at(
        connection,
        {
          cartId: validCartId,
          itemId: invalidItemId,
        },
      );
    },
  );

  // 8. Register another customer to verify access control
  const anotherCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "diffPass123",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const anotherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: anotherCustomerBody,
    });
  typia.assert(anotherCustomer);

  // Upon successful join, the connection authentication token switches
  // to anotherCustomer automatically.

  // 9. Attempt to retrieve first customer's cart item with another customer's auth - expect error
  await TestValidator.error(
    "unauthorized access to cart item should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.items.at(
        connection,
        {
          cartId: validCartId,
          itemId: validItemId,
        },
      );
    },
  );
}
