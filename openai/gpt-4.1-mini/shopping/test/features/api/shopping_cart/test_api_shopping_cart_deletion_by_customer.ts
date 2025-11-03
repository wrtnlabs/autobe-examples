import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_shopping_cart_deletion_by_customer(
  connection: api.IConnection,
) {
  // Register a new customer account to authenticate
  const customerCreateBody = {
    email: `user${Date.now()}@example.com`,
    password: "password123",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // Generate a plausible UUID for the customer session ID required for shopping cart creation
  const shoppingMallCustomerSessionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Create a new shopping cart for the authenticated customer using their ID and generated session ID
  const shoppingCartCreateBody = {
    shopping_mall_customer_id: authorizedCustomer.id,
    shopping_mall_customer_session_id: shoppingMallCustomerSessionId,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const createdCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      { body: shoppingCartCreateBody },
    );
  typia.assert(createdCart);

  // Delete the shopping cart by its unique ID
  await api.functional.shoppingMall.customer.shoppingCarts.erase(connection, {
    id: createdCart.id,
  });

  // Attempt to delete the same cart again to verify error handling
  await TestValidator.error(
    "deleting non-existent cart should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.erase(
        connection,
        {
          id: createdCart.id,
        },
      );
    },
  );
}
