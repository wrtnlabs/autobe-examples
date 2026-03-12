import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an authenticated customer can retrieve their wishlist items with product information.
 *
 * This test validates the wishlist listing functionality by:
 * 1. Registering a new customer account
 * 2. Retrieving the customer's wishlist with default pagination
 * 3. Verifying the response structure and pagination metadata
 * 4. Confirming each wishlist item has required fields (id, created_at)
 */
export async function test_api_wishlist_list_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 2. Call PATCH /shoppingMall/customer/wishlist with empty request body (use defaults)
  const wishlist = await api.functional.shoppingMall.customer.wishlist.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallWishlistItem.IRequest,
    },
  );
  typia.assert(wishlist);
  // 3. Verify pagination metadata is present and valid
  TestValidator.equals(
    "pagination current page",
    wishlist.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination default limit",
    wishlist.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    wishlist.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    wishlist.pagination.pages >= 0,
  );
  // 4. Verify data array exists and contains wishlist items (may be empty)
  TestValidator.predicate(
    "wishlist data is an array",
    Array.isArray(wishlist.data),
  );
  TestValidator.equals(
    "wishlist data length matches records",
    wishlist.data.length,
    wishlist.pagination.records,
  );
  // 5. Verify each wishlist item has required fields (typia.assert already validates types)
  // Just verify business logic: items should exist if records > 0
  TestValidator.predicate(
    "wishlist items count matches pagination",
    wishlist.data.length === wishlist.pagination.records,
  );
  // 6. Test with explicit pagination parameters
  const paginatedWishlist =
    await api.functional.shoppingMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(paginatedWishlist);
  TestValidator.equals(
    "custom pagination current page",
    paginatedWishlist.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination limit",
    paginatedWishlist.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "custom pagination data length within limit",
    paginatedWishlist.data.length <= 10,
  );
}
