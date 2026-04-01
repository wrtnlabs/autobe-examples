import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
 * Test the edge case where a customer has an empty wishlist.
 *
 * **Setup:**
 * 1. Register a new customer account using authorize_customer_join utility function
 * 2. Customer has no wishlist items by default after registration
 *
 * **Test Execution:**
 * 1. Create customer-specific connection and authenticate via authorize_customer_join
 * 2. Call wishlist_items.index endpoint with default pagination parameters
 * 3. Verify response returns empty data array
 * 4. Validate pagination metadata shows: records=0, pages=0, current=1, limit=20 (default)
 *
 * **Business Logic Validation:**
 * - Empty wishlist returns valid paginated response structure
 * - No errors occur when querying non-existent wishlist items
 * - Pagination metadata correctly reflects zero records
 * - Response structure is consistent with non-empty wishlist responses
 */
export async function test_api_wishlist_items_empty_wishlist(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Retrieve wishlist items for customer with no saved products
  const wishlist =
    await api.functional.shoppingMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "desc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlist);
  // 3. Validate empty data array
  TestValidator.equals("wishlist data array", wishlist.data, []);
  // 4. Validate pagination metadata
  TestValidator.equals("records count", wishlist.pagination.records, 0);
  TestValidator.equals("pages count", wishlist.pagination.pages, 0);
  TestValidator.equals("current page", wishlist.pagination.current, 1);
  TestValidator.equals("limit", wishlist.pagination.limit, 20);
}
