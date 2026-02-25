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
 * Test wishlist pagination to verify correct page navigation.
 *
 * This test validates that pagination parameters are properly processed
 * and pagination metadata is correctly computed according to the
 * IPage.IPagination schema.
 *
 * **Test Flow:**
 * 1. Register a new customer account
 * 2. Call wishlist endpoint with specific pagination parameters (page=1, limit=10)
 * 3. Verify pagination metadata reflects the requested values
 * 4. Verify pagination calculations are correct
 */
export async function test_api_wishlist_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Request wishlist with specific pagination parameters
  const page1Result =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(page1Result);
  // 3. Verify pagination metadata reflects requested values
  TestValidator.equals("current page", page1Result.pagination.current, 1);
  TestValidator.equals("limit", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    page1Result.pagination.records >= 0,
  );
  // 4. Verify pages calculation: Math.ceil(records / limit)
  const expectedPages = Math.ceil(
    page1Result.pagination.records / page1Result.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    page1Result.pagination.pages,
    expectedPages,
  );
  // 5. Test with maximum limit to verify limit enforcement
  const maxLimitResult =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  // 6. Verify maximum limit (100) is respected
  TestValidator.predicate(
    "limit respects maximum of 100",
    maxLimitResult.pagination.limit <= 100,
  );
  TestValidator.equals(
    "current page for max limit",
    maxLimitResult.pagination.current,
    1,
  );
  // 7. Test default pagination (minimal request body)
  const defaultResult =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(defaultResult);
  // 8. Verify default pagination uses system defaults
  TestValidator.predicate(
    "default current page is at least 1",
    defaultResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default limit is at least 1",
    defaultResult.pagination.limit >= 1,
  );
}
