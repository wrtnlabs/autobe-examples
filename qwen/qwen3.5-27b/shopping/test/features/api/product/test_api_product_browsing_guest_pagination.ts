import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test pagination functionality for product browsing by guest users.
 * 1. Create guest session using authorize_guest_join
 * 2. Retrieve products with custom pagination parameters
 * 3. Verify pagination metadata accuracy across multiple pages
 * 4. Test edge cases: beyond total pages, small datasets with limited records
 */
export async function test_api_product_browsing_guest_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Test basic pagination with page=1, limit=10
  const page1 = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page1);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  TestValidator.predicate(
    "page 1 records >= data length",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "page 1 pages calculation",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // 3. Test page=2 with same limit
  const page2 = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page2);
  // Verify pagination metadata for page 2
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records matches page 1",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 2 total pages matches page 1",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  // Verify no duplicate products between pages
  const page1Ids = page1.data.map((p) => p.id);
  const page2Ids = page2.data.map((p) => p.id);
  const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "no duplicates between page 1 and 2",
    duplicates.length === 0,
  );
  // 4. Test page=3
  const page3 = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        page: 3,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals(
    "page 3 total records matches",
    page3.pagination.records,
    page1.pagination.records,
  );
  // 5. Test edge case: page beyond total pages returns empty data
  const beyondPage = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        page: 9999,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current is 9999",
    beyondPage.pagination.current,
    9999,
  );
  TestValidator.equals(
    "beyond page records matches",
    beyondPage.pagination.records,
    page1.pagination.records,
  );
  // 6. Test edge case: limit at maximum (100)
  const maxLimit = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals("max limit is 100", maxLimit.pagination.limit, 100);
  TestValidator.predicate(
    "data length <= max limit",
    maxLimit.data.length <= 100,
  );
  // 7. Test edge case: when total records < limit, pages should be 1
  const smallLimit = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(smallLimit);
  if (smallLimit.pagination.records < 100) {
    TestValidator.equals(
      "pages is 1 when records < limit",
      smallLimit.pagination.pages,
      1,
    );
    TestValidator.equals(
      "all records returned on first page",
      smallLimit.data.length,
      smallLimit.pagination.records,
    );
  }
  // 8. Verify consistency: all pages should have same total records
  TestValidator.equals(
    "all pages have consistent total records",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "page 1 and page 3 have consistent records",
    page1.pagination.records,
    page3.pagination.records,
  );
  TestValidator.equals(
    "page 1 and beyond page have consistent records",
    page1.pagination.records,
    beyondPage.pagination.records,
  );
}
