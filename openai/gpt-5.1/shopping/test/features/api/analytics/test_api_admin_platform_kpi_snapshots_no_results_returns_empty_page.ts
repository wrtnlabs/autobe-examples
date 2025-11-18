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

/**
 * Validate that admin KPI snapshot search returns an empty page for filters
 * with no matching data.
 *
 * Business context: Administrative analytics dashboards often query KPI
 * snapshots over arbitrary time windows. When a filter window matches no stored
 * snapshots, the API must still succeed and return a well-formed, empty page
 * object instead of throwing an error or returning null. This test uses a
 * far-future time range to guarantee an empty result set while keeping the
 * scenario stable over time.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Create a dummy shopping mall configuration via POST
 *    /shoppingMall/admin/configs to simulate a realistic admin environment.
 * 3. Call PATCH /shoppingMall/admin/analytics/platformKpiSnapshots with
 *    IShoppingMallPlatformKpiSnapshot.IRequest where periodStartFrom and
 *    periodStartTo are set to a far-future window (year 2100), and page=1,
 *    limit=10.
 * 4. Assert that the response is a valid
 *    IPageIShoppingMallPlatformKpiSnapshot.ISummary with:
 *
 *    - Pagination.current === 1
 *    - Pagination.limit === 10
 *    - Pagination.records === 0
 *    - Pagination.pages is either 0 or 1, depending on platform semantics
 *    - Data is an empty array.
 */
export async function test_api_admin_platform_kpi_snapshots_no_results_returns_empty_page(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a dummy global configuration to mimic realistic admin usage
  const configCreateBody = {
    namespace: "analytics",
    config_key: "platformKpiDefaults",
    environment: "test",
    description: "Test configuration for KPI snapshot empty-page scenario",
    value_json: JSON.stringify({
      feature: "kpi-empty-page-test",
      enabled: true,
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configCreateBody,
    });
  typia.assert(createdConfig);

  // 3. Build far-future KPI snapshot search request that must match no records
  const futureFrom = "2100-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;
  const futureTo = "2100-12-31T23:59:59.000Z" as string &
    tags.Format<"date-time">;

  const requestBody = {
    periodStartFrom: futureFrom,
    periodStartTo: futureTo,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  const page: IPageIShoppingMallPlatformKpiSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  const pagination = page.pagination;

  // 4. Business assertions about empty page semantics
  TestValidator.equals(
    "pagination.current should be 1 for the first page of an empty result",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should reflect requested page size",
    pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination.records should be zero when no KPI snapshots match filters",
    pagination.records,
    0,
  );

  // pages may be 0 or 1 depending on platform semantics; accept both
  TestValidator.predicate(
    "pagination.pages should be 0 or 1 for an empty KPI snapshot result",
    pagination.pages === 0 || pagination.pages === 1,
  );

  TestValidator.equals(
    "data array must be empty when no KPI snapshots match the filters",
    page.data.length,
    0,
  );
}
