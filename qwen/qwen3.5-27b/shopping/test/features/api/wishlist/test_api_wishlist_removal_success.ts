import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test successful removal of a product from customer's wishlist.
 * Validates the complete workflow: customer registration, adding product to wishlist,
 * removing it, and verifying the removal allows re-adding the same product.
 */
export async function test_api_wishlist_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Generate a product UUID for wishlist operations
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Add product to wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId },
    );
  typia.assert(wishlistItem);
  // Verify the wishlist item was created with correct product
  TestValidator.equals(
    "wishlist product ID matches",
    wishlistItem.product.id,
    productId,
  );
  // 4. Remove product from wishlist
  await api.functional.shoppingMall.customer.wishlist.erase(
    customerConnection,
    {
      productId,
    },
  );
  // 5. Verify removal by attempting to add the same product again
  // If removal was successful, this should work without duplicate error
  const readdedWishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId },
    );
  typia.assert(readdedWishlistItem);
  // Verify the re-added item is valid
  TestValidator.equals(
    "re-added wishlist product ID matches",
    readdedWishlistItem.product.id,
    productId,
  );
  // Verify the new wishlist item has a different ID from the original
  TestValidator.notEquals(
    "wishlist item IDs are different",
    wishlistItem.id,
    readdedWishlistItem.id,
  );
}
