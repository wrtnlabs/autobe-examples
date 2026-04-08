import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test wishlist listing when customer has no saved items (edge case - empty wishlist).
 *
 * Steps:
 * 1. Authenticate as a new customer using /ecommerceMall/auth/customer/join
 * 2. Do NOT add any items to wishlist
 * 3. Call PATCH /ecommerceMall/customer/wishlist-items to retrieve the wishlist
 * 4. Verify response structure is valid pagination object
 * 5. Validate that items array is empty
 * 6. Verify pagination metadata shows total: 0, current page empty
 * 7. Test various filter parameters on empty wishlist to ensure they don't cause errors
 *
 * Expected outcomes:
 * - Returns 200 OK (not 404) even with empty wishlist
 * - Response contains empty items array
 * - Pagination metadata correctly shows zero total items
 * - No errors when applying filters to empty wishlist
 * - Customer sees empty state appropriately
 */
export async function test_api_wishlist_items_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 3-7. Call PATCH /ecommerceMall/customer/wishlist-items with various filters
  // Test basic empty wishlist retrieval
  const emptyWishlist =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(emptyWishlist);
  // 5. Validate that items array is empty
  TestValidator.equals("wishlist items array is empty", emptyWishlist.data, []);
  // 6. Verify pagination metadata shows zero total items
  TestValidator.equals(
    "pagination current page",
    emptyWishlist.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", emptyWishlist.pagination.limit, 20);
  TestValidator.equals(
    "pagination records (total)",
    emptyWishlist.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", emptyWishlist.pagination.pages, 0);
  // 7. Test various filter parameters on empty wishlist to ensure they don't cause errors
  const searchFilters: IEcommerceMallWishlistItem.IRequest[] = [
    { search: "test" },
    { category_id: typia.random<string & tags.Format<"uuid">>() },
    { seller_id: typia.random<string & tags.Format<"uuid">>() },
    { min_price: 1000, max_price: 5000 },
    { sort_by: "created_at", sort_order: "desc" },
    { sort_by: "name", sort_order: "asc" },
    { sort_by: "base_price", sort_order: "desc" },
    { page: 1, limit: 10 },
    { page: 2, limit: 20 },
  ];
  for (const filter of searchFilters) {
    const filteredWishlist =
      await api.functional.ecommerceMall.customer.wishlist_items.index(
        customerConnection,
        {
          body: filter satisfies IEcommerceMallWishlistItem.IRequest,
        },
      );
    typia.assert(filteredWishlist);
    // All filter variations should return empty results for empty wishlist
    TestValidator.equals(
      `wishlist with filter ${JSON.stringify(filter)} returns empty array`,
      filteredWishlist.data,
      [],
    );
    TestValidator.equals(
      `pagination records is 0 with filter ${JSON.stringify(filter)}`,
      filteredWishlist.pagination.records,
      0,
    );
  }
}
