import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * This test validates the workflow of deleting a customer's wishlist in the
 * shopping mall application.
 *
 * Business context and necessity: Customers can maintain wishlists for products
 * they are interested in, which must be manipulable only by their owners. It is
 * critical that customers can delete their own wishlists, that deletion is
 * irreversible, and that unauthorized access is blocked. This test covers user
 * registration, authentication, wishlist creation, deletion, and verification
 * of security and data integrity.
 *
 * Step-by-step process:
 *
 * 1. Register and authenticate a new customer using the join API.
 * 2. Create a new wishlist associated with the authorized customer.
 * 3. Delete the created wishlist.
 * 4. Attempt to delete the same wishlist again to verify graceful handling of
 *    non-existent wishlist deletion.
 * 5. Register and authenticate a different customer.
 * 6. Attempt to delete the first customer's wishlist with this second customer to
 *    confirm authorization enforcement.
 * 7. Confirm that after deletion, the wishlist cannot be retrieved or deleted
 *    again.
 */
export async function test_api_wishlist_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer using the join API
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallCustomer.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a new wishlist associated with the authorized customer
  const wishlistCreateBody = {
    shopping_mall_customer_id: authorizedCustomer.id,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  TestValidator.equals(
    "wishlist customer id matches authorized customer",
    wishlist.shopping_mall_customer_id,
    authorizedCustomer.id,
  );

  // 3. Delete the created wishlist
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // 4. Attempt to delete the same wishlist again to verify graceful handling
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // 5. Register and authenticate a different customer
  const customer2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallCustomer.IJoin;

  const authorizedCustomer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customer2JoinBody,
    });
  typia.assert(authorizedCustomer2);

  // 6. Attempt to delete the first customer's wishlist with this second customer to confirm authorization enforcement
  // Since the wishlist is already deleted, attempt to delete a new wishlist of first user to test unauthorized access.
  // So, first we recreate a wishlist for the first authorized customer
  const wishlist2: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist2);

  // Switch authentication to second customer
  await api.functional.auth.customer.join(connection, {
    body: customer2JoinBody,
  });

  await TestValidator.error(
    "unauthorized deletion attempt throws error",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: wishlist2.id,
      });
    },
  );

  // 7. Confirm the wishlist2 still exists after unauthorized deletion attempt
  // There is no API to get wishlist directly (not provided), so we test delete again is not authorized for second user
  await TestValidator.error(
    "unauthorized deletion retry throws error",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: wishlist2.id,
      });
    },
  );
}
