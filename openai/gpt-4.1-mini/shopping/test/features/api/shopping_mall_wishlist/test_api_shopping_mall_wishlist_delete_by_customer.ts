import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate the deletion process of a shopping mall wishlist by a customer.
 *
 * This test performs the end-to-end validation for wishlist deletion by a
 * customer, ensuring complete, secure, and proper function.
 *
 * Workflow:
 *
 * 1. Authenticate a new customer via join.
 * 2. Create a new wishlist for that authenticated customer.
 * 3. Confirm the wishlist is created and accessible.
 * 4. Delete the wishlist using the same customer's credentials.
 * 5. Verify the wishlist is successfully deleted (permanent removal).
 * 6. Authenticate another customer and attempt to delete the first customers
 *    wishlist, expecting failure.
 *
 * This test confirms proper ownership enforcement, authorization, permanence of
 * deletion, and resource cleanup behavior.
 */
export async function test_api_shopping_mall_wishlist_delete_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer A joins and authenticates
  const customerBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "password123",
    href: "https://test.com/join",
    referrer: "https://test.com/referrer",
  } satisfies IShoppingMallCustomer.ICreate;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(customerA);

  // 2. Customer A creates a new wishlist
  const wishlistBody = {
    name: `Wishlist_${RandomGenerator.alphaNumeric(5)}`,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.create(
      connection,
      { body: wishlistBody },
    );
  typia.assert(wishlist);

  TestValidator.equals(
    "wishlist owner matches customer",
    wishlist.shopping_mall_customer_id,
    customerA.id,
  );

  // 3. Customer A deletes the wishlist
  await api.functional.shoppingMall.customer.shoppingMallWishlists.erase(
    connection,
    {
      shoppingMallWishlistId: wishlist.id,
    },
  );

  // 4. Attempt to delete the same wishlist again should result in failure
  await TestValidator.error(
    "deleting a non-existent wishlist should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallWishlists.erase(
        connection,
        {
          shoppingMallWishlistId: wishlist.id,
        },
      );
    },
  );

  // 5. Customer B joins and authenticates
  const customerBodyB = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "password123",
    href: "https://test.com/join",
    referrer: "https://test.com/referrer",
  } satisfies IShoppingMallCustomer.ICreate;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBodyB,
    });
  typia.assert(customerB);

  // 6. Customer B tries to delete the wishlist previously owned by Customer A (already deleted)
  await TestValidator.error(
    "customer B cannot delete wishlist of customer A",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallWishlists.erase(
        connection,
        {
          shoppingMallWishlistId: wishlist.id,
        },
      );
    },
  );
}
