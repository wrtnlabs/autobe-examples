import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test viewing an empty wishlist for a newly registered customer.
 *
 * This test verifies that:
 * 1. A newly registered customer can access their wishlist
 * 2. The wishlist endpoint returns proper pagination structure for empty results
 * 3. Pagination metadata correctly reflects empty state (records=0, pages=0)
 */
export async function test_api_wishlist_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Retrieve the wishlist (should be empty for new customer)
  const wishlist = await api.functional.shoppingMall.customer.wishlists.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallWishlist.IRequest,
    },
  );
  typia.assert(wishlist);
  // 3. Validate empty wishlist response
  TestValidator.equals("current page", wishlist.pagination.current, 1);
  TestValidator.equals("record count is 0", wishlist.pagination.records, 0);
  TestValidator.equals("page count is 0", wishlist.pagination.pages, 0);
  TestValidator.equals("data array is empty", wishlist.data.length, 0);
}
