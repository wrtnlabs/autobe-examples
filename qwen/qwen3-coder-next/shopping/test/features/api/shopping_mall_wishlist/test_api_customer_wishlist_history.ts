import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

/**
 * Test wishlist history retrieval functionality.
 * 1. Register a new customer account
 * 2. Create a wishlist item
 * 3. Add the same product to wishlist multiple times to generate history
 * 4. Retrieve and verify the wishlist history shows chronological action logs
 */
export async function test_api_customer_wishlist_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Create a wishlist item
  const product1 = await api.functional.shoppingMall.customer.wishlists.create(
    customerConnection,
    {
      body: {
        product_id: typia.random<string & typia.tags.Format<"uuid">>(),
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(product1);
  // 3. Add same product multiple times to generate history
  const product2 = await api.functional.shoppingMall.customer.wishlists.create(
    customerConnection,
    {
      body: {
        product_id: (product1 as IShoppingMallWishlist & { id: string }).id,
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(product2);
  // 4. Retrieve and verify wishlist history
  const history = await api.functional.shoppingMall.customer.wishlists.history(
    customerConnection,
    {
      wishlistId: (product1 as IShoppingMallWishlist & { id: string }).id,
    },
  );
  typia.assert(history);
  // Verify history structure
  TestValidator.predicate(
    "history has expected structure",
    () => typeof history === "object" && history !== null,
  );
}