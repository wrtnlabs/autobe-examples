import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
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
import { generate_random_shopping_mall_customer_wishlists_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_items_create";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {});
  typia.assert(authResult);
  // 2. Add multiple products to wishlist
  const wishlistItems = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_shopping_mall_customer_wishlists_items_create(
      customerConnection,
      {},
    );
  });
  // 3. Retrieve wishlist with pagination
  const response = await api.functional.shoppingMall.customer.wishlists.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlistItem.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    response.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit", response.pagination.limit === 10);
  TestValidator.predicate(
    "pagination records",
    response.pagination.records >= wishlistItems.length,
  );
  TestValidator.predicate("pagination pages", response.pagination.pages >= 1);
  // 5. Validate wishlist items are sorted by created_at descending
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    TestValidator.predicate(
      "items sorted by created_at descending",
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
}
