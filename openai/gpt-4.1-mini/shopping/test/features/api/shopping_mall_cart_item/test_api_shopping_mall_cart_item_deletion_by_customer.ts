import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test complete workflow of deleting a specific shopping mall cart item by its
 * owner customer.
 *
 * This test performs the following steps:
 *
 * 1. Authenticate as a new customer by joining (signup).
 * 2. Create a shopping mall customer resource for the authenticated user.
 * 3. Create a new shopping mall cart associated with the newly created customer.
 * 4. Add one item (shopping mall cart item) to the created shopping cart.
 * 5. Delete the specific shopping mall cart item that was just added.
 * 6. Assert that the deletion was successful and the item no longer exists.
 *
 * At each step, the test asserts object typings and validates data integrity.
 * Authorization contexts are managed automatically by the API client.
 */
export async function test_api_shopping_mall_cart_item_deletion_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer registration and authentication (join)
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "strongpassword123",
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(authorizedCustomer);

  // Step 2: Create shopping mall customer resource
  const customerCreateBody = {
    email: authorizedCustomer.email,
    password: "strongpassword123",
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const shoppingMallCustomer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      {
        body: customerCreateBody,
      },
    );
  typia.assert(shoppingMallCustomer);

  // Step 3: Create a shopping mall cart associated with the customer
  const cartCreateBody = {} satisfies IShoppingMallCart.ICreate;
  const shoppingMallCart =
    await api.functional.shoppingMall.customer.shoppingMallCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(shoppingMallCart);

  // Step 4: Add a shopping mall cart item to the created cart
  // For shoppingMallProductVariantId, generate a random UUID as placeholder
  const cartItemCreateBody = {
    quantity: 1,
    shoppingMallProductVariantId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallCartItem.ICreate;

  const shoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingMallCarts.shoppingMallCartItems.create(
      connection,
      {
        shoppingMallCartId: shoppingMallCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(shoppingMallCartItem);

  // Step 5: Delete the shopping mall cart item
  await api.functional.shoppingMall.customer.shoppingMallCarts.shoppingMallCartItems.erase(
    connection,
    {
      shoppingMallCartId: shoppingMallCart.id,
      shoppingMallCartItemId: shoppingMallCartItem.id,
    },
  );

  // Step 6: Verify deletion by attempting to delete the same item again expecting failure
  await TestValidator.error(
    "Deleting the same cart item again should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallCarts.shoppingMallCartItems.erase(
        connection,
        {
          shoppingMallCartId: shoppingMallCart.id,
          shoppingMallCartItemId: shoppingMallCartItem.id,
        },
      );
    },
  );
}
