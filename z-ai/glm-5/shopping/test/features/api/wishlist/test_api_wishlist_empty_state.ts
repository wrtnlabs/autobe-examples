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

export async function test_api_wishlist_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer (who will have an empty wishlist)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Call wishlist endpoint with default parameters (empty state)
  const emptyWishlist =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(emptyWishlist);
  // 3. Verify empty wishlist response structure
  TestValidator.equals("data array is empty", emptyWishlist.data.length, 0);
  TestValidator.equals(
    "pagination current is 1",
    emptyWishlist.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 (default)",
    emptyWishlist.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records is 0",
    emptyWishlist.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    emptyWishlist.pagination.pages,
    0,
  );
  // 4. Test with custom limit parameter
  const wishlistWithLimit =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistWithLimit);
  TestValidator.equals(
    "data array is empty with custom limit",
    wishlistWithLimit.data.length,
    0,
  );
  TestValidator.equals(
    "pagination limit is 10 with custom limit",
    wishlistWithLimit.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records is 0 with custom limit",
    wishlistWithLimit.pagination.records,
    0,
  );
  // 5. Test with page parameter
  const wishlistWithPage =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistWithPage);
  TestValidator.equals(
    "data array is empty with page param",
    wishlistWithPage.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current is 1 with page param",
    wishlistWithPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records is 0 with page param",
    wishlistWithPage.pagination.records,
    0,
  );
  // 6. Test with sort parameter
  const wishlistWithSort =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistWithSort);
  TestValidator.equals(
    "data array is empty with sort",
    wishlistWithSort.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 with sort",
    wishlistWithSort.pagination.records,
    0,
  );
  // 7. Test accessing page beyond available data
  const wishlistBeyondRange =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistBeyondRange);
  TestValidator.equals(
    "data array is empty for page beyond range",
    wishlistBeyondRange.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for page beyond range",
    wishlistBeyondRange.pagination.records,
    0,
  );
}
