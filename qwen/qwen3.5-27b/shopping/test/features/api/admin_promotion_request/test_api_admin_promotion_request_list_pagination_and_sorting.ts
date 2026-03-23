import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination behavior and custom sorting options for administrator promotion requests.
 *
 * This test validates:
 * 1. Custom page size configuration and enforcement
 * 2. Page navigation with proper OFFSET calculation
 * 3. Custom sorting by different fields (submitted_at, responded_at, created_at)
 * 4. Ascending and descending order support
 * 5. Boundary conditions (max limit, non-existent pages)
 * 6. Pagination metadata accuracy (current, limit, records, pages)
 */
export async function test_api_admin_promotion_request_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test custom page size (limit: 10)
  const page1Result =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 limit is 10", page1Result.pagination.limit, 10);
  TestValidator.equals(
    "page 1 current is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1Result.data.length <= 10,
  );
  TestValidator.equals(
    "page 1 pages calculation",
    page1Result.pagination.pages,
    Math.ceil(page1Result.pagination.records / 10),
  );
  // 3. Test page navigation (page: 2)
  const page2Result =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 10", page2Result.pagination.limit, 10);
  // Verify no duplicate items between pages
  const page1Ids = page1Result.data.map((item) => item.id);
  const page2Ids = page2Result.data.map((item) => item.id);
  const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals("no duplicates between pages", duplicates.length, 0);
  // 4. Test custom sort by responded_at DESC
  const sortByRespondedDesc =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "responded_at",
          order: "desc",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sortByRespondedDesc);
  // Verify ordering: non-null responded_at values should come first in descending order
  let lastRespondedAt: string | null = null;
  for (const item of sortByRespondedDesc.data) {
    if (item.responded_at !== null) {
      if (lastRespondedAt !== null) {
        TestValidator.predicate(
          `responded_at descending order (${item.id})`,
          new Date(item.responded_at).getTime() <=
            new Date(lastRespondedAt).getTime(),
        );
      }
      lastRespondedAt = item.responded_at;
    }
  }
  // 5. Test ascending order by submitted_at
  const sortBySubmittedAsc =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "submitted_at",
          order: "asc",
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sortBySubmittedAsc);
  // Verify ordering: oldest submitted_at first
  for (let i = 1; i < sortBySubmittedAsc.data.length; i++) {
    const prevItem = sortBySubmittedAsc.data[i - 1];
    const currItem = sortBySubmittedAsc.data[i];
    TestValidator.predicate(
      `submitted_at ascending order (item ${i})`,
      new Date(prevItem.submitted_at).getTime() <=
        new Date(currItem.submitted_at).getTime(),
    );
  }
  // 6. Test boundary condition: max limit (100)
  const maxLimitResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit is 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data length <= 100",
    maxLimitResult.data.length <= 100,
  );
  // 7. Test boundary condition: non-existent page (999)
  const nonExistentPageResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(nonExistentPageResult);
  TestValidator.equals(
    "non-existent page current is 999",
    nonExistentPageResult.pagination.current,
    999,
  );
  TestValidator.equals(
    "non-existent page data is empty",
    nonExistentPageResult.data.length,
    0,
  );
  TestValidator.predicate(
    "non-existent page has valid pagination",
    nonExistentPageResult.pagination.records >= 0 &&
      nonExistentPageResult.pagination.pages >= 0,
  );
  // 8. Test default sort (submitted_at DESC)
  const defaultSortResult =
    await api.functional.shoppingMall.admin.adminPromotionRequests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(defaultSortResult);
  // Verify default ordering: newest submitted_at first
  for (let i = 1; i < defaultSortResult.data.length; i++) {
    const prevItem = defaultSortResult.data[i - 1];
    const currItem = defaultSortResult.data[i];
    TestValidator.predicate(
      `default sort submitted_at descending (item ${i})`,
      new Date(prevItem.submitted_at).getTime() >=
        new Date(currItem.submitted_at).getTime(),
    );
  }
}
