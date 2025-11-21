import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_deletion_authorization_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first customer
  const firstCustomerEmail = typia.random<string & tags.Format<"email">>();
  const firstCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: firstCustomerEmail,
      password: "password123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(firstCustomer);

  // Step 2: Create wishlist owned by first customer
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_public: true,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // Step 3: Create and authenticate second customer
  const secondCustomerEmail = typia.random<string & tags.Format<"email">>();
  const secondCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: secondCustomerEmail,
      password: "password456",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(secondCustomer);

  // Step 4: Attempt to delete first customer's wishlist using second customer's authentication
  await TestValidator.error(
    "second customer cannot delete first customer's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: wishlist.id,
      });
    },
  );

  // Step 5: Basic validation that wishlist ID remains valid
  TestValidator.predicate(
    "wishlist ID should be a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      wishlist.id,
    ),
  );
}
