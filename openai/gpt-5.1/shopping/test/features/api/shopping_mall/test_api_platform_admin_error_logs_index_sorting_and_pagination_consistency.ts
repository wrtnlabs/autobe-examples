import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallErrorLog";
import type { IShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallErrorLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_error_logs_index_sorting_and_pagination_consistency(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated platformAdmin session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a broad time range and common filter for error log search.
  const now = new Date();
  const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const commonFilter = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    from: fromDate.toISOString() as string & tags.Format<"date-time">,
    to: now.toISOString() as string & tags.Format<"date-time">,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallErrorLog.IRequest;

  // 3. Call page 1 (page = 1)
  const page1Response: IPageIShoppingMallErrorLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.errorLogs.index(
      connection,
      {
        body: commonFilter,
      },
    );
  typia.assert(page1Response);

  // 4. Call page 2 (page = 2) with the same filters but different page
  const page2Filter = {
    ...commonFilter,
    page: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallErrorLog.IRequest;

  const page2Response: IPageIShoppingMallErrorLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.errorLogs.index(
      connection,
      {
        body: page2Filter,
      },
    );
  typia.assert(page2Response);

  const page1Pagination = page1Response.pagination;
  const page2Pagination = page2Response.pagination;
  const page1Data = page1Response.data;
  const page2Data = page2Response.data;

  // 5. Basic pagination sanity checks.
  TestValidator.equals(
    "page1 and page2 should have the same limit",
    page1Pagination.limit,
    page2Pagination.limit,
  );

  TestValidator.equals(
    "page1 and page2 should have the same total records",
    page1Pagination.records,
    page2Pagination.records,
  );

  TestValidator.equals(
    "page1 and page2 should have the same total pages",
    page1Pagination.pages,
    page2Pagination.pages,
  );

  // The backend uses 0-based page index for `current`, while request uses 1-based `page`.
  TestValidator.equals(
    "page1 should map to current=0",
    page1Pagination.current,
    0,
  );

  TestValidator.equals(
    "page2 should map to current=1",
    page2Pagination.current,
    1,
  );

  // 6. Verify that each page is sorted correctly by created_at in descending order.
  const isSortedDesc = (items: IShoppingMallErrorLog.ISummary[]): boolean => {
    for (let i = 1; i < items.length; i++) {
      if (items[i - 1].created_at < items[i].created_at) return false;
    }
    return true;
  };

  TestValidator.predicate(
    "page1 data should be sorted by created_at desc",
    () => isSortedDesc(page1Data),
  );

  TestValidator.predicate(
    "page2 data should be sorted by created_at desc",
    () => isSortedDesc(page2Data),
  );

  // 7. Cross-page consistency when there are at least 10 records (two full pages).
  if (page1Pagination.records >= 10) {
    TestValidator.equals(
      "page1 should have 5 items when records >= 10",
      page1Data.length,
      5,
    );

    TestValidator.equals(
      "page2 should have 5 items when records >= 10",
      page2Data.length,
      5,
    );

    const combined = [...page1Data, ...page2Data];

    TestValidator.predicate(
      "combined page1+page2 should remain sorted desc by created_at",
      () => isSortedDesc(combined),
    );

    // Ensure no overlapping ids between page1 and page2.
    const page1Ids = new Set(page1Data.map((log) => log.id));
    const hasOverlap = page2Data.some((log) => page1Ids.has(log.id));

    TestValidator.predicate(
      "page1 and page2 should have no overlapping ids when records >= 10",
      () => hasOverlap === false,
    );
  }

  // 8. Optional: repeat test with ascending sort direction, only if there is enough data.
  if (page1Pagination.records >= 2) {
    const ascCommonFilter = {
      ...commonFilter,
      sort_direction: "asc",
    } satisfies IShoppingMallErrorLog.IRequest;

    const ascPage1: IPageIShoppingMallErrorLog.ISummary =
      await api.functional.shoppingMall.platformAdmin.errorLogs.index(
        connection,
        {
          body: ascCommonFilter,
        },
      );
    typia.assert(ascPage1);

    const ascPage2Filter = {
      ...ascCommonFilter,
      page: 2 as number & tags.Type<"int32">,
    } satisfies IShoppingMallErrorLog.IRequest;

    const ascPage2: IPageIShoppingMallErrorLog.ISummary =
      await api.functional.shoppingMall.platformAdmin.errorLogs.index(
        connection,
        {
          body: ascPage2Filter,
        },
      );
    typia.assert(ascPage2);

    const ascPage1Data = ascPage1.data;
    const ascPage2Data = ascPage2.data;

    const isSortedAsc = (items: IShoppingMallErrorLog.ISummary[]): boolean => {
      for (let i = 1; i < items.length; i++) {
        if (items[i - 1].created_at > items[i].created_at) return false;
      }
      return true;
    };

    TestValidator.predicate(
      "asc page1 data should be sorted by created_at asc",
      () => isSortedAsc(ascPage1Data),
    );

    TestValidator.predicate(
      "asc page2 data should be sorted by created_at asc",
      () => isSortedAsc(ascPage2Data),
    );
  }
}
