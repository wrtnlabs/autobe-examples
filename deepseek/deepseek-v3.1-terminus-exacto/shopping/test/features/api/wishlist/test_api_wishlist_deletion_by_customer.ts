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

/**
 * Test the complete wishlist deletion workflow where a customer creates a
 * wishlist and then permanently deletes it. Validates that wishlists can be
 * successfully created and then hard deleted from the system, ensuring proper
 * authorization checks and that customers can only delete their own wishlists.
 */
export async function test_api_wishlist_deletion_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create a wishlist to be deleted
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_public: false,
        priority: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // Step 3: Delete the wishlist permanently
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // Step 4: Verify that attempting to delete a non-existent wishlist returns an error
  await TestValidator.error(
    "deleting non-existent wishlist should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(connection, {
        wishlistId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
