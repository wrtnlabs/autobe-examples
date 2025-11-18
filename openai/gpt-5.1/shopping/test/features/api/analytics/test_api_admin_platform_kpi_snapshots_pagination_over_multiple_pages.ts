import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformKpiSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpiSnapshot";

export async function test_api_admin_platform_kpi_snapshots_pagination_over_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a global configuration to simulate realistic environment
  const configBody = {
    namespace: "analytics",
    config_key: `platform-kpi-${RandomGenerator.alphabets(6)}`,
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    value_json: JSON.stringify({
      kpiPipelines: [
        { key: "platform_gmv", enabled: true },
        { key: "platform_orders", enabled: true },
      ],
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert(createdConfig);

  // 3. First KPI snapshot search with wide time window on page 1
  const now = new Date();
  const past = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // ~5 years ago

  const page = 1;
  const limit = 20 as number & tags.Type<"int32">;

  const requestBodyPage1 = {
    periodTypes: ["day", "week", "month"],
    periodStartFrom: past.toISOString(),
    periodStartTo: now.toISOString(),
    page,
    limit,
    orderBy: "period_start",
    orderDirection: "desc",
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  const firstPage: IPageIShoppingMallPlatformKpiSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.index(
      connection,
      {
        body: requestBodyPage1,
      },
    );
  typia.assert(firstPage);

  const pagination1 = firstPage.pagination;
  const data1 = firstPage.data;

  // Basic invariants on page 1
  TestValidator.equals(
    "page 1 current page index must be 1",
    1,
    pagination1.current,
  );
  TestValidator.equals(
    "page 1 limit must equal requested limit",
    limit,
    pagination1.limit,
  );
  TestValidator.predicate(
    "total records must be non-negative",
    pagination1.records >= 0,
  );
  TestValidator.predicate(
    "total pages must be non-negative",
    pagination1.pages >= 0,
  );

  if (pagination1.records === 0) {
    // No snapshots at all: still ensure data slice is empty and pages is 0 or 1
    TestValidator.equals(
      "no records should result in empty data on page 1",
      0,
      data1.length,
    );
    TestValidator.predicate(
      "when no records, pages should be 0 or 1",
      pagination1.pages === 0 || pagination1.pages === 1,
    );
    return;
  }

  // For any non-zero records, first page must contain some data but not exceed limit
  TestValidator.predicate(
    "page 1 must return at least one record",
    data1.length > 0,
  );
  TestValidator.predicate(
    "page 1 length must not exceed limit",
    data1.length <= limit,
  );
  TestValidator.predicate(
    "total records must be at least number of items on first page",
    pagination1.records >= (data1.length as number),
  );

  // If all records fit on a single page, we can't test cross-page behavior
  if (pagination1.records <= limit || pagination1.pages <= 1) {
    TestValidator.equals(
      "single-page result must have pages equal to 1",
      1,
      pagination1.pages,
    );
    TestValidator.equals(
      "single-page result must have data length equal to total records",
      data1.length,
      pagination1.records,
    );
    return;
  }

  // Capture IDs from first page for overlap checking
  const idsPage1 = new Set<string>();
  for (const snapshot of data1) {
    idsPage1.add(snapshot.id);
  }

  const totalRecords = pagination1.records;

  // 4. Second KPI snapshot search for page 2 with identical filters but page=2
  const requestBodyPage2 = {
    periodTypes: requestBodyPage1.periodTypes,
    periodStartFrom: requestBodyPage1.periodStartFrom,
    periodStartTo: requestBodyPage1.periodStartTo,
    page: 2,
    limit,
    orderBy: requestBodyPage1.orderBy,
    orderDirection: requestBodyPage1.orderDirection,
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  const secondPage: IPageIShoppingMallPlatformKpiSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.index(
      connection,
      {
        body: requestBodyPage2,
      },
    );
  typia.assert(secondPage);

  const pagination2 = secondPage.pagination;
  const data2 = secondPage.data;

  // Page 2 metadata validation
  TestValidator.equals(
    "page 2 current page index must be 2",
    2,
    pagination2.current,
  );
  TestValidator.equals(
    "page 2 limit must equal requested limit",
    limit,
    pagination2.limit,
  );
  TestValidator.equals(
    "total records must match between page 1 and page 2",
    totalRecords,
    pagination2.records,
  );
  TestValidator.equals(
    "total pages must match between page 1 and page 2",
    pagination1.pages,
    pagination2.pages,
  );

  TestValidator.predicate(
    "page 2 must return at least one record",
    data2.length > 0,
  );
  TestValidator.predicate(
    "page 2 length must not exceed limit",
    data2.length <= limit,
  );

  // 5. Ensure no overlap between page 1 and page 2 ids
  for (const snapshot of data2) {
    TestValidator.predicate(
      "no overlap between snapshot ids of page 1 and page 2",
      idsPage1.has(snapshot.id) === false,
    );
  }

  // 6. Optional: verify that summing up across first few pages is within totalRecords
  const maxPagesToCheck = Math.min(pagination1.pages, 5);
  let accumulatedCount = data1.length + data2.length;

  for (let p = 3; p <= maxPagesToCheck; ++p) {
    const requestBodyNext = {
      periodTypes: requestBodyPage1.periodTypes,
      periodStartFrom: requestBodyPage1.periodStartFrom,
      periodStartTo: requestBodyPage1.periodStartTo,
      page: p,
      limit,
      orderBy: requestBodyPage1.orderBy,
      orderDirection: requestBodyPage1.orderDirection,
    } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

    const pageResp: IPageIShoppingMallPlatformKpiSnapshot.ISummary =
      await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.index(
        connection,
        {
          body: requestBodyNext,
        },
      );
    typia.assert(pageResp);

    TestValidator.equals(
      `page ${p} current page index must equal requested page`,
      p,
      pageResp.pagination.current,
    );
    TestValidator.equals(
      `page ${p} must keep same total records`,
      totalRecords,
      pageResp.pagination.records,
    );

    accumulatedCount += pageResp.data.length;
  }

  TestValidator.predicate(
    "accumulated count across checked pages must not exceed totalRecords",
    accumulatedCount <= totalRecords,
  );
}
