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
 * Validate admin KPI snapshot search with GMV amount range and ascending sort.
 *
 * Business context: Platform KPI snapshots are sensitive analytics records only
 * accessible to admins. Admins need to be able to search KPI snapshots filtered
 * by GMV range and see results sorted by GMV so they can focus on periods with
 * specific transaction volumes.
 *
 * Test purpose:
 *
 * - Ensure an admin can authenticate via /auth/admin/join and then call the KPI
 *   snapshot search endpoint.
 * - Ensure that the KPI search request using GMV range filters and sort settings
 *   succeeds and returns a properly typed page response.
 * - Ensure that each returned snapshot respects the requested GMV range [T_min,
 *   T_max].
 * - Ensure that the returned snapshots are ordered by gmv_amount ascending.
 *
 * Notes on feasibility:
 *
 * - There is no API surface to create or mutate KPI snapshots directly, so the
 *   test cannot guarantee the presence of out-of-range rows in the database.
 *   Instead, the test verifies that _all_ returned rows obey the constraints
 *   and that ascending ordering by GMV is respected. If the dataset contains
 *   out-of-range rows, a correctly implemented backend would omit them; this
 *   property is indirectly validated by checking every returned row.
 */
export async function test_api_admin_platform_kpi_snapshots_search_by_kpi_amount_range(
  connection: api.IConnection,
) {
  // 1. Admin joins (establish admin auth context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a platform config to mirror a realistic environment
  const configBody = {
    namespace: "analytics",
    config_key: "kpi-thresholds",
    environment: "test",
    description: "E2E test config for KPI thresholds",
    value_json: JSON.stringify({
      gmvAlertThreshold: 100000,
      nmvAlertThreshold: 80000,
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Define GMV range and paging/sorting options
  const T_min = 10_000;
  const T_max = 1_000_000;

  const requestBody = {
    periodTypes: ["day", "week"],
    minGmvAmount: T_min,
    maxGmvAmount: T_max,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    orderBy: "gmv_amount",
    orderDirection: "asc",
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  // 4. Execute KPI snapshot search
  const pageResult: IPageIShoppingMallPlatformKpiSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallPlatformKpiSnapshot.ISummary>(pageResult);
  typia.assert<IPage.IPagination>(pageResult.pagination);

  // 5. Validate GMV range constraints on each returned snapshot
  const snapshots: IShoppingMallPlatformKpiSnapshot.ISummary[] =
    pageResult.data;

  // If there are no snapshots, we still consider the test successful for type
  // and filter compatibility; the following assertions guard only when data
  // exists.
  if (snapshots.length > 0) {
    for (const snapshot of snapshots) {
      typia.assert<IShoppingMallPlatformKpiSnapshot.ISummary>(snapshot);
      TestValidator.predicate(
        "snapshot GMV within requested range",
        snapshot.gmv_amount >= T_min && snapshot.gmv_amount <= T_max,
      );
    }

    // 6. Validate ascending sort order by gmv_amount
    for (let i = 1; i < snapshots.length; ++i) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      TestValidator.predicate(
        "snapshots sorted by gmv_amount ascending",
        prev.gmv_amount <= curr.gmv_amount,
      );
    }
  }
}
