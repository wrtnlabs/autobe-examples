import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformKpiSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpiSnapshot";

export async function test_api_admin_platform_kpi_search_with_gmv_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin and authenticate
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Prepare a wide date window around now
  const now = new Date();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const periodStartFrom = new Date(now.getTime() - oneYearMs).toISOString();
  const periodEndTo = new Date(now.getTime() + oneYearMs).toISOString();

  // GMV band #1: medium band
  const minGmv1 = 1_000;
  const maxGmv1 = 100_000;

  const requestBody1 = {
    periodTypes: ["day"],
    periodStartFrom,
    periodEndTo,
    minGmvAmount: minGmv1,
    maxGmvAmount: maxGmv1,
    page: 1,
    limit: 20,
    orderBy: "period_start",
    orderDirection: "desc",
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  const page1: IPageIShoppingMallPlatformKpiSnapshot =
    await api.functional.shoppingMall.admin.analytics.platformKpis.index(
      connection,
      { body: requestBody1 },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // 3. Basic pagination validations for first response
  TestValidator.equals(
    "first query - pagination current matches requested page",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "first query - pagination limit matches requested limit",
    pagination1.limit,
    20,
  );
  TestValidator.predicate(
    "first query - pagination records not less than data length",
    pagination1.records >= data1.length,
  );
  TestValidator.predicate(
    "first query - pagination pages non-negative",
    pagination1.pages >= 0,
  );

  // 4. Validate GMV band and period window constraints when there is data
  for (const snapshot of data1) {
    TestValidator.predicate(
      "first query - snapshot GMV >= minGmv1",
      snapshot.gmv_amount >= minGmv1,
    );
    TestValidator.predicate(
      "first query - snapshot GMV <= maxGmv1",
      snapshot.gmv_amount <= maxGmv1,
    );
    TestValidator.predicate(
      "first query - snapshot period_start within requested range",
      snapshot.period_start >= periodStartFrom &&
        snapshot.period_start <= periodEndTo,
    );
    TestValidator.predicate(
      "first query - snapshot period_end within requested range",
      snapshot.period_end >= periodStartFrom &&
        snapshot.period_end <= periodEndTo,
    );
  }

  // 5. Second query with a higher GMV band to demonstrate filter effect
  const minGmv2 = maxGmv1 + 1_000;
  const maxGmv2 = maxGmv1 + 1_000_000;

  const requestBody2 = {
    periodTypes: ["day"],
    periodStartFrom,
    periodEndTo,
    minGmvAmount: minGmv2,
    maxGmvAmount: maxGmv2,
    page: 1,
    limit: 20,
    orderBy: "period_start",
    orderDirection: "desc",
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  const page2: IPageIShoppingMallPlatformKpiSnapshot =
    await api.functional.shoppingMall.admin.analytics.platformKpis.index(
      connection,
      { body: requestBody2 },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  // 6. Pagination validations for second response
  TestValidator.equals(
    "second query - pagination current matches requested page",
    pagination2.current,
    1,
  );
  TestValidator.equals(
    "second query - pagination limit matches requested limit",
    pagination2.limit,
    20,
  );
  TestValidator.predicate(
    "second query - pagination records not less than data length",
    pagination2.records >= data2.length,
  );
  TestValidator.predicate(
    "second query - pagination pages non-negative",
    pagination2.pages >= 0,
  );

  // 7. Validate GMV band and period window constraints for second response
  for (const snapshot of data2) {
    TestValidator.predicate(
      "second query - snapshot GMV >= minGmv2",
      snapshot.gmv_amount >= minGmv2,
    );
    TestValidator.predicate(
      "second query - snapshot GMV <= maxGmv2",
      snapshot.gmv_amount <= maxGmv2,
    );
    TestValidator.predicate(
      "second query - snapshot period_start within requested range",
      snapshot.period_start >= periodStartFrom &&
        snapshot.period_start <= periodEndTo,
    );
    TestValidator.predicate(
      "second query - snapshot period_end within requested range",
      snapshot.period_end >= periodStartFrom &&
        snapshot.period_end <= periodEndTo,
    );
  }

  // 8. If both result sets have data, ensure they are not deeply equal to
  // demonstrate that GMV filters change the result set (best-effort check).
  if (data1.length > 0 && data2.length > 0) {
    TestValidator.notEquals(
      "GMV-filtered queries should produce different data sets when both non-empty",
      data1,
      data2,
    );
  }
}
