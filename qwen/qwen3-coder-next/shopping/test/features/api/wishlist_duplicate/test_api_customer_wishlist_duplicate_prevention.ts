import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
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

export async function test_api_customer_wishlist_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customer);
  // 2. Generate a random product_id for wishlist testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. First wishlist entry should succeed
  const wishlist1 = await api.functional.shoppingMall.customer.wishlists.create(
    customerConnection,
    {
      body: { product_id: productId } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist1);
  // 4. Second attempt with same product_id should fail with 409 Conflict
  await TestValidator.error("duplicate wishlist entry", async () => {
    await api.functional.shoppingMall.customer.wishlists.create(
      customerConnection,
      {
        body: { product_id: productId } satisfies IShoppingMallWishlist.ICreate,
      },
    );
  });
}
