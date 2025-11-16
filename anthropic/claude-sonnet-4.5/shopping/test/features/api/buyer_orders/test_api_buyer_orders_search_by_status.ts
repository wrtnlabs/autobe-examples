import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function test_api_buyer_orders_search_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Define status values to test
  const statusesToTest = [
    "pending_payment",
    "payment_confirmed",
    "processing",
    "shipped",
    "delivered",
    "completed",
  ] as const;

  // Step 3: Test filtering by each status value
  for (const status of statusesToTest) {
    const searchResult: IPageIShoppingMallOrder.ISummary =
      await api.functional.shoppingMall.buyer.orders.index(connection, {
        body: {
          page: 1,
          limit: 10,
          status: status,
        } satisfies IShoppingMallOrder.IRequest,
      });

    // Validate the response structure
    typia.assert(searchResult);

    // Validate pagination metadata exists and is correct
    TestValidator.predicate(
      "pagination should have valid current page",
      searchResult.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination should have valid limit",
      searchResult.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "pagination records should be non-negative",
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages should be non-negative",
      searchResult.pagination.pages >= 0,
    );

    // Validate data array exists
    TestValidator.predicate(
      "search result should contain data array",
      Array.isArray(searchResult.data),
    );
  }

  // Step 4: Test with additional filter combinations
  const combinedSearchResult: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.buyer.orders.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "shipped",
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    });

  typia.assert(combinedSearchResult);
  TestValidator.equals(
    "combined search pagination limit matches request",
    combinedSearchResult.pagination.limit,
    20,
  );
}
