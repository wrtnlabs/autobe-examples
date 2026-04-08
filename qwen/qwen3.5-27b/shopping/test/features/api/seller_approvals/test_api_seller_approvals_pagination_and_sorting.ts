import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test pagination and sorting of seller approval requests for administrator review.
 *
 * Validates the complete pagination and sorting functionality of the seller approvals endpoint. Ensures that administrators can efficiently navigate through large sets of seller registration requests using pagination controls and sort results by various criteria including email, shop name, and registration date.
 *
 * The test verifies pagination boundaries, sorting accuracy, and metadata correctness. Special attention is given to validating that pagination metadata accurately reflects the total record count and page calculations.
 *
 * 1. Authenticate as administrator with randomized credentials.
 * 2. Retrieve first page with limit=10 and verify pagination structure.
 * 3. Retrieve second page with page=2, limit=10 and verify different records.
 * 4. Sort by email ascending and verify alphabetical order (A-Z).
 * 5. Sort by shop_name descending and verify reverse alphabetical order (Z-A).
 * 6. Sort by created_at ascending and verify chronological order (oldest first).
 * 7. Validate pagination metadata (current page, limit, total records, total pages).
 * 8. Verify no duplicate sellers across different pages.
 * 9. Test default sorting behavior (created_at descending).
 */
export async function test_api_seller_approvals_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    },
  });
  // 2. Test pagination: First page with limit=10
  const page1 =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "first page has correct record count",
    page1.data.length <= 10,
  );
  TestValidator.predicate(
    "total records matches pagination",
    page1.pagination.records >= page1.data.length,
  );
  // 3. Test pagination: Second page with page=2, limit=10
  const page2 =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.equals("limit is 10", page2.pagination.limit, 10);
  TestValidator.predicate(
    "second page has correct record count",
    page2.data.length <= 10,
  );
  // Verify no duplicate sellers between page 1 and page 2
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = page1.data.map((s) => s.id);
    const page2Ids = page2.data.map((s) => s.id);
    const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
    TestValidator.predicate(
      "no duplicates between pages",
      duplicates.length === 0,
    );
  }
  // 4. Test sorting by email ascending (A-Z)
  const sortedByEmailAsc =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          limit: 100,
          sort: {
            field: "email",
            direction: "asc",
          },
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(sortedByEmailAsc);
  // Verify emails are in ascending order
  for (let i = 1; i < sortedByEmailAsc.data.length; i++) {
    TestValidator.predicate(
      `email ${i} <= email ${i + 1}`,
      sortedByEmailAsc.data[i - 1].email <= sortedByEmailAsc.data[i].email,
    );
  }
  // 5. Test sorting by shop_name descending (Z-A)
  const sortedByShopNameDesc =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          limit: 100,
          sort: {
            field: "shop_name",
            direction: "desc",
          },
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(sortedByShopNameDesc);
  // Verify shop names are in descending order
  for (let i = 1; i < sortedByShopNameDesc.data.length; i++) {
    TestValidator.predicate(
      `shop_name ${i} >= shop_name ${i + 1}`,
      sortedByShopNameDesc.data[i - 1].seller_profile.shop_name >=
        sortedByShopNameDesc.data[i].seller_profile.shop_name,
    );
  }
  // 6. Test sorting by created_at ascending (oldest first)
  const sortedByCreatedAtAsc =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          limit: 100,
          sort: {
            field: "created_at",
            direction: "asc",
          },
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtAsc);
  // Verify created_at dates are in ascending order (oldest first)
  for (let i = 1; i < sortedByCreatedAtAsc.data.length; i++) {
    TestValidator.predicate(
      `created_at ${i} <= created_at ${i + 1}`,
      new Date(sortedByCreatedAtAsc.data[i - 1].created_at).getTime() <=
        new Date(sortedByCreatedAtAsc.data[i].created_at).getTime(),
    );
  }
  // 7. Test default sorting (should be created_at descending)
  const defaultSort =
    await api.functional.shoppingMall.administrator.seller_approvals.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(defaultSort);
  // Verify default sort is created_at descending (newest first)
  for (let i = 1; i < defaultSort.data.length; i++) {
    TestValidator.predicate(
      `default sort: created_at ${i} >= created_at ${i + 1}`,
      new Date(defaultSort.data[i - 1].created_at).getTime() >=
        new Date(defaultSort.data[i].created_at).getTime(),
    );
  }
  // 8. Validate pagination metadata consistency
  TestValidator.predicate(
    "pages calculation is correct",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  TestValidator.predicate(
    "current page within bounds",
    page1.pagination.current >= 1 &&
      page1.pagination.current <= page1.pagination.pages,
  );
}
