import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

export async function test_api_wishlist_items_index_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 3. Test empty wishlist - should return empty data with pagination metadata
  const emptyResult =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "pagination exists",
    emptyResult.pagination !== undefined,
    true,
  );
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals("current page is 1", emptyResult.pagination.current, 1);
  TestValidator.equals("default limit is 20", emptyResult.pagination.limit, 20);
  TestValidator.equals("total records is 0", emptyResult.pagination.records, 0);
  TestValidator.equals("total pages is 0", emptyResult.pagination.pages, 0);
  // 4. Test with pagination parameters
  const paginatedResult =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("page 2", paginatedResult.pagination.current, 2);
  TestValidator.equals("limit 10", paginatedResult.pagination.limit, 10);
  // 5. Test with sorting by created_at ascending
  const sortedAscResult =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          direction: "asc",
        },
      },
    );
  typia.assert(sortedAscResult);
  TestValidator.predicate(
    "sorted results have valid structure",
    sortedAscResult.data.every(
      (item) => item.id !== undefined && item.product !== undefined,
    ),
  );
  // 6. Test with sorting by name descending
  const sortedDescResult =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          sort: "name",
          direction: "desc",
        },
      },
    );
  typia.assert(sortedDescResult);
  TestValidator.predicate(
    "sorted results have valid structure",
    sortedDescResult.data.every(
      (item) => item.id !== undefined && item.product !== undefined,
    ),
  );
  // 7. Test with price range filter
  const filteredResult =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          min_price: 1000,
          max_price: 10000,
        },
      },
    );
  typia.assert(filteredResult);
  TestValidator.predicate(
    "filtered results have valid structure",
    filteredResult.data.every(
      (item) => item.id !== undefined && item.product !== undefined,
    ),
  );
  // 8. Test with search query
  const searchResult =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          search: "test",
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search results have valid structure",
    searchResult.data.every(
      (item) => item.id !== undefined && item.product !== undefined,
    ),
  );
}