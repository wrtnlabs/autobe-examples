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

export async function test_api_shopping_cart_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "StrongPassword123!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Prepare an initial shopping cart for the customer
  // Here, since there's no direct cart creation API, we simulate or assume an existing cart
  const cartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Compose update data for the shopping cart
  const updateBody = {
    shopping_mall_customer_id: customer.id,
  } satisfies IShoppingMallShoppingCart.IUpdate;

  // 4. Perform the update operation
  const updatedCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.update(
      connection,
      {
        id: cartId,
        body: updateBody,
      },
    );
  typia.assert(updatedCart);

  // 5. Verify updated cart belongs to the customer
  TestValidator.equals(
    "updated cart belongs to customer",
    updatedCart.shopping_mall_customer_id,
    customer.id,
  );

  // 6. Optional: Verify updated_at timestamp is equal or later than created_at
  const createdAt = new Date(updatedCart.created_at);
  const updatedAt = new Date(updatedCart.updated_at);
  TestValidator.predicate(
    "updated_at is equal or later than created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );

  // 7. Test invalid user cannot update cart (unauthenticated connection)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update cart",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.update(
        unauthenticatedConn,
        {
          id: cartId,
          body: updateBody,
        },
      );
    },
  );
}
