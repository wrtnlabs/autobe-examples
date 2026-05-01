import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Verify that an empty wishlist returns proper pagination metadata for both valid and out-of-range page requests.
 *
 * Ensures that a newly registered customer with an empty wishlist receives a well-structured empty response with correct pagination metadata. The test confirms that the pagination metadata reflects zero records and zero pages, and that the data array is empty for both the first page request and an out-of-range second page request.
 *
 * 1. Register a new customer account via authorize_customer_join with randomly generated credentials.
 * 2. Request page 1 with limit 10 — verify pagination metadata: current=1, limit=10, records=0, pages=0, and empty data array.
 * 3. Request page 2 with limit 10 — verify the same zero-count pagination metadata with current reflecting the requested page number, confirming the specification that out-of-range pages return empty results without error.
 */
export async function test_api_wishlist_list_empty_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Request the first page of the empty wishlist
  const page1 = await api.functional.shoppingMall.customer.wishlist_items.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlistItem.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page1 current",
    page1.pagination.current,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "page1 limit",
    page1.pagination.limit,
    10 satisfies number as number,
  );
  TestValidator.equals(
    "page1 records",
    page1.pagination.records,
    0 satisfies number as number,
  );
  TestValidator.equals(
    "page1 pages",
    page1.pagination.pages,
    0 satisfies number as number,
  );
  TestValidator.predicate("page1 empty data", page1.data.length === 0);
  // 3. Request an out-of-range page — should still return empty with zero metadata
  const page2 = await api.functional.shoppingMall.customer.wishlist_items.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallWishlistItem.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page2 current",
    page2.pagination.current,
    2 satisfies number as number,
  );
  TestValidator.equals(
    "page2 limit",
    page2.pagination.limit,
    10 satisfies number as number,
  );
  TestValidator.equals(
    "page2 records",
    page2.pagination.records,
    0 satisfies number as number,
  );
  TestValidator.equals(
    "page2 pages",
    page2.pagination.pages,
    0 satisfies number as number,
  );
  TestValidator.predicate("page2 empty data", page2.data.length === 0);
}
