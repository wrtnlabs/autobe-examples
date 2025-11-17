import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_shopping_mall_wishlist_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration (join) to obtain authentication context
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a new wishlist
  const wishlistName1: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.create(
      connection,
      {
        body: {
          name: wishlistName1,
        } satisfies IShoppingMallWishlist.ICreate,
      },
    );
  typia.assert(wishlist);

  // 3. Update the wishlist with new information
  const newDeletedAt: (string & tags.Format<"date-time">) | null = null;
  const newName: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  // Since the DTO IShoppingMallWishlist.IUpdate only defines deleted_at,
  // but the name property is only in ICreate, we'll just test update with deleted_at explicitly using null
  // We will simulate update by refreshing deleted_at (null means active).

  const updateBody = {
    deleted_at: newDeletedAt,
  } satisfies IShoppingMallWishlist.IUpdate;

  // Call update operation
  const updatedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.update(
      connection,
      {
        shoppingMallWishlistId: wishlist.id,
        body: updateBody,
      },
    );

  typia.assert(updatedWishlist);

  // Validate that update preserved customer ownership and wishlist id unchanged
  TestValidator.equals(
    "wishlist id unchanged",
    updatedWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist customer id unchanged",
    updatedWishlist.shopping_mall_customer_id,
    wishlist.shopping_mall_customer_id,
  );

  // Validate timestamps: updated_at is refreshed (>= than previous updated_at)
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(updatedWishlist.updated_at).getTime() >=
      new Date(wishlist.updated_at).getTime(),
  );

  // Ensure deleted_at property matches update input
  TestValidator.equals(
    "deleted_at updated properly",
    updatedWishlist.deleted_at,
    newDeletedAt,
  );

  // 4. Unauthorized user cannot update someone else's wishlist
  // Register a second customer to test unauthorized update
  const attackerEmail: string = typia.random<string & tags.Format<"email">>();
  const attacker: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: attackerEmail,
        password: "1234",
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(attacker);

  // Switch to unauthorized context by logging in attacker
  // The test environment automatically switches authentication token via join

  // Attempt to update the wishlist with attacker's authentication
  await TestValidator.error(
    "attacker cannot update another customer's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallWishlists.update(
        connection,
        {
          shoppingMallWishlistId: wishlist.id,
          body: {
            deleted_at: new Date().toISOString(),
          } satisfies IShoppingMallWishlist.IUpdate,
        },
      );
    },
  );
}
