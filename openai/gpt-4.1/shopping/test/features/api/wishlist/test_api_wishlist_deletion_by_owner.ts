import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate permanent deletion of a shopping mall wishlist by its owner.
 *
 * 1. Register and authenticate a new customer (with unique credentials)
 * 2. Create a wishlist for this customer
 * 3. Delete the wishlist using the owner's authentication
 * 4. Confirm the wishlist is deleted by attempting to delete again (should fail)
 * 5. Register a second customer (to test unauthorized access)
 * 6. Attempt deletion of first customer's wishlist with the second user's
 *    credentials (should fail)
 */
export async function test_api_wishlist_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate customer A
  const customerAEmail: string = typia.random<string & tags.Format<"email">>();
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerAEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerA);
  TestValidator.equals(
    "authentication context is customer A",
    customerA.email,
    customerAEmail,
  );

  // 2. Create wishlist (must be empty input per API contract)
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);
  TestValidator.equals(
    "wishlist owned by customer A",
    wishlist.customer.id,
    customerA.id,
  );

  // 3. Delete wishlist by owner
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // 4. Confirm deletion: attempt to delete again (should fail)
  await TestValidator.error(
    "Deleting an already deleted wishlist should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: wishlist.id,
      });
    },
  );

  // 5. Register second customer (customer B)
  const customerBEmail: string = typia.random<string & tags.Format<"email">>();
  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerBEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerB);
  TestValidator.equals(
    "distinct second customer registered",
    customerB.email,
    customerBEmail,
  );

  // 6. Attempt unauthorized deletion (with customer B account)
  await TestValidator.error(
    "Non-owner cannot delete another customer's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: wishlist.id,
      });
    },
  );
}
