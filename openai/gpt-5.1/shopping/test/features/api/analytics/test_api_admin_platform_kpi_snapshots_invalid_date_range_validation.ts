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
 * Validate that platform KPI snapshot analytics search rejects an invalid
 * periodStartFrom/periodStartTo range for admin analytics.
 *
 * Business flow:
 *
 * 1. Join a new admin account via /auth/admin/join to obtain an authorized admin
 *    session and token.
 * 2. Seed at least one configuration entry via /shoppingMall/admin/configs to
 *    mimic a realistic analytics environment.
 * 3. Build an invalid KPI search request body where periodStartFrom is after
 *    periodStartTo while keeping other filters (like periodTypes and
 *    pagination) valid.
 * 4. Call PATCH /shoppingMall/admin/analytics/platformKpiSnapshots using the
 *    invalid body and assert that the SDK throws an error using
 *    TestValidator.error, indicating a validation failure for the inconsistent
 *    date range.
 * 5. Do not treat any response as a successful page result in the invalid
 *    scenario; the test passes only when an error is thrown and caught by
 *    TestValidator.error.
 */
export async function test_api_admin_platform_kpi_snapshots_invalid_date_range_validation(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed at least one shopping mall configuration
  const configBody = {
    namespace: "analytics",
    config_key: "default-platform-kpi-window",
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({ enabled: true }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert(createdConfig);

  // 3. Construct invalid KPI snapshot search request
  const later: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const earlier: string & tags.Format<"date-time"> = new Date(
    Date.now(),
  ).toISOString() as string & tags.Format<"date-time">;

  const invalidRequest = {
    periodTypes: ["day"],
    periodStartFrom: later,
    periodStartTo: earlier,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  // 4. Call analytics search with invalid date range and expect validation error
  await TestValidator.error(
    "platform KPI snapshot search must reject invalid periodStart range",
    async () => {
      await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.index(
        connection,
        {
          body: invalidRequest,
        },
      );
    },
  );
}
