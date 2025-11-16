import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate sorting and pagination behavior of platform admin configuration
 * change analytics listing.
 *
 * This test exercises the end-to-end workflow around configuration changes and
 * the analytics endpoint that exposes them. It ensures that when many
 * configuration changes exist, the analytics listing correctly honors
 * page/limit parameters, returns consistent pagination metadata, and orders
 * results by created_at in both descending and ascending directions.
 *
 * Steps:
 *
 * 1. Join a platform admin using POST /auth/platformAdmin/join, which also
 *    establishes an authenticated session and token.
 * 2. As that admin, create a sufficient number of shopping mall configs with POST
 *    /shoppingMall/platformAdmin/configs so that the
 *    shopping_mall_admin_configuration_change_logs table accumulates at least
 *    25+ change entries.
 * 3. Call PATCH /shoppingMall/platformAdmin/analytics/adminConfigurations with
 *    IShoppingMallAdminConfigurationChangeLog.IRequest specifying page=1,
 *    limit=10, sortBy="created_at", sortDirection="desc" to fetch the first
 *    page of change logs.
 * 4. Assert that:
 *
 *    - The response type matches
 *         IPageIShoppingMallAdminConfigurationChangeLog.ISummary and passes
 *         typia.assert.
 *    - Pagination.current is 0 (zero-based for first page).
 *    - Pagination.limit equals 10.
 *    - Pagination.records is at least the number of configs created (or greater, if
 *         prior data exist).
 *    - Pagination.pages is >= 1.
 *    - Data is sorted by created_at in descending order.
 * 5. Call the same endpoint again with page=2 (second client-visible page,
 *    expecting pagination.current=1) and the same limit/sort, then verify:
 *
 *    - Pagination.current is 1.
 *    - Pagination.limit remains 10.
 *    - Data entries are sorted by created_at descending.
 *    - The set of log ids in page 1 and page 2 do not intersect.
 * 6. Optionally, request page=1 with sortDirection="asc" and confirm that:
 *
 *    - Created_at timestamps are sorted ascending.
 */
export async function test_api_admin_configuration_change_logs_sorting_and_pagination(
  connection: api.IConnection,
) {
  // 1. Join platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create many configs to generate change logs
  const configCount = 30;
  const createdConfigs: IShoppingMallConfig[] = [];

  for (let i = 0; i < configCount; i++) {
    const body = {
      namespace: `ns_${Math.floor(i / 5)}`,
      key: `key_${i}`,
      value: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      active: true,
    } satisfies IShoppingMallConfig.ICreate;

    const created =
      await api.functional.shoppingMall.platformAdmin.configs.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdConfigs.push(created);
  }

  // Helper to assert sorted order by created_at
  const assertSortedByCreatedAt = (
    title: string,
    data: IShoppingMallAdminConfigurationChangeLog.ISummary[],
    direction: "asc" | "desc",
  ) => {
    TestValidator.predicate(title, () => {
      for (let i = 1; i < data.length; i++) {
        const prev = new Date(data[i - 1].created_at).getTime();
        const curr = new Date(data[i].created_at).getTime();
        if (direction === "desc" && prev < curr) return false;
        if (direction === "asc" && prev > curr) return false;
      }
      return true;
    });
  };

  // 3. Fetch first page (page=1 -> expect pagination.current=0)
  const reqPage1 = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const page1: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminConfigurations.index(
      connection,
      { body: reqPage1 },
    );
  typia.assert(page1);

  const page1Pagination = page1.pagination;
  const page1Data = page1.data;

  // Basic pagination assertions for page 1
  TestValidator.equals(
    "page1: pagination.current should be 0 for first page",
    page1Pagination.current,
    0,
  );
  TestValidator.equals(
    "page1: pagination.limit should equal requested limit",
    page1Pagination.limit,
    reqPage1.limit,
  );
  TestValidator.predicate(
    "page1: records should be at least number of created configs",
    () => page1Pagination.records >= createdConfigs.length,
  );
  TestValidator.predicate(
    "page1: pages should be >= 1",
    () => page1Pagination.pages >= 1,
  );
  TestValidator.predicate(
    "page1: data length should be > 0 and <= limit",
    () => page1Data.length > 0 && page1Data.length <= reqPage1.limit,
  );

  assertSortedByCreatedAt(
    "page1: data sorted by created_at desc",
    page1Data,
    "desc",
  );

  // 4. Fetch second page (page=2 -> expect pagination.current=1)
  const reqPage2 = {
    page: 2,
    limit: reqPage1.limit,
    sortBy: reqPage1.sortBy,
    sortDirection: reqPage1.sortDirection,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const page2: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminConfigurations.index(
      connection,
      { body: reqPage2 },
    );
  typia.assert(page2);

  const page2Pagination = page2.pagination;
  const page2Data = page2.data;

  TestValidator.equals(
    "page2: pagination.current should be 1 for second page",
    page2Pagination.current,
    1,
  );
  TestValidator.equals(
    "page2: pagination.limit should equal requested limit",
    page2Pagination.limit,
    reqPage2.limit,
  );
  TestValidator.predicate(
    "page2: data length should be <= limit",
    () => page2Data.length <= reqPage2.limit,
  );

  assertSortedByCreatedAt(
    "page2: data sorted by created_at desc",
    page2Data,
    "desc",
  );

  // 5. Ensure no overlapping ids between page1 and page2
  const page1Ids = new Set(page1Data.map((log) => log.id));
  const hasOverlap = page2Data.some((log) => page1Ids.has(log.id));
  TestValidator.predicate(
    "page1 and page2 should have disjoint id sets",
    () => !hasOverlap,
  );

  // 6. Optional: Ascending sort check on first page
  const reqAscPage1 = {
    page: 1,
    limit: reqPage1.limit,
    sortBy: reqPage1.sortBy,
    sortDirection: "asc" as const,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const ascPage1: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminConfigurations.index(
      connection,
      { body: reqAscPage1 },
    );
  typia.assert(ascPage1);

  const ascData = ascPage1.data;
  assertSortedByCreatedAt(
    "page1 asc: data sorted by created_at asc",
    ascData,
    "asc",
  );
}
