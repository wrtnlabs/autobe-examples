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
 * Test that the system prevents duplicate wishlist entries for the same product.
 *
 * This test verifies that when a customer attempts to add the same product
 * to their wishlist multiple times, the system correctly prevents duplicate
 * entries and maintains data integrity.
 */
export async function test_api_wishlist_duplicate_product_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Generate a valid product UUID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First call: Add product to wishlist (should succeed)
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId },
    );
  typia.assert(wishlistItem);
  // 4. Validate first call response
  TestValidator.equals(
    "wishlist item has correct product",
    wishlistItem.product.id,
    productId,
  );
  TestValidator.predicate(
    "wishlist item has valid timestamp",
    !!wishlistItem.createdAt,
  );
  // 5. Second call: Attempt to add same product again (should fail)
  await TestValidator.error("duplicate wishlist entry prevented", async () => {
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId },
    );
  });
}
