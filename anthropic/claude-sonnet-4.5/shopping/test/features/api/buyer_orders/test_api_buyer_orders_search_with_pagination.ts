import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function test_api_buyer_orders_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account for pagination testing
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
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

  // Step 2: Test pagination with default parameters (no page/limit specified)
  const defaultPage = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {} satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(defaultPage);

  // Step 3: Test with specific page size (limit = 10)
  const page1WithLimit10 = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page1WithLimit10);
  TestValidator.equals(
    "page 1 current should be 1",
    page1WithLimit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 10",
    page1WithLimit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 data array length respects limit",
    page1WithLimit10.data.length <= 10,
  );

  // Step 4: Test with different page size (limit = 5)
  const page1WithLimit5 = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page1WithLimit5);
  TestValidator.equals(
    "page 1 with limit 5 current should be 1",
    page1WithLimit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 with limit 5 limit should be 5",
    page1WithLimit5.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 1 with limit 5 data respects limit",
    page1WithLimit5.data.length <= 5,
  );

  // Step 5: Test navigating to page 2
  const page2 = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 current should be 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit should be 10", page2.pagination.limit, 10);

  // Step 6: Test requesting a page beyond available range
  const beyondPage = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        page: 9999,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page current should be 9999",
    beyondPage.pagination.current,
    9999,
  );
  TestValidator.predicate(
    "beyond page should have empty data",
    beyondPage.data.length === 0,
  );
  TestValidator.predicate(
    "beyond page metadata should be consistent",
    beyondPage.pagination.pages < 9999 || beyondPage.pagination.records === 0,
  );

  // Step 7: Test maximum limit boundary (limit = 100)
  const maxLimitPage = await api.functional.shoppingMall.buyer.orders.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit should be 100",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data respects limit",
    maxLimitPage.data.length <= 100,
  );

  // Step 8: Validate pagination calculation correctness
  if (page1WithLimit10.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1WithLimit10.pagination.records / page1WithLimit10.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation is correct",
      page1WithLimit10.pagination.pages,
      expectedPages,
    );
  }
}
