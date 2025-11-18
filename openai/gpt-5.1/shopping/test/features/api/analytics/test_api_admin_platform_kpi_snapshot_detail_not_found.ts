import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpiSnapshot";

/**
 * Validate behavior when an admin requests KPI snapshot detail with a
 * non-existent ID.
 *
 * Business goal:
 *
 * - Ensure that an authenticated admin calling the platform KPI snapshot detail
 *   endpoint with an identifier that does not correspond to any persisted
 *   snapshot results in some kind of failure instead of returning a valid
 *   snapshot document.
 * - Also sanity-check that the detail endpoint returns a structurally valid KPI
 *   snapshot object in happy-path scenarios, especially when the connection is
 *   in simulation mode.
 *
 * Scenario steps:
 *
 * 1. Admin join: create a new admin account via POST /auth/admin/join,
 *    establishing Authorization headers for subsequent admin-only endpoints.
 * 2. Create a config: POST /shoppingMall/admin/configs to mimic realistic
 *    operational state for the analytics endpoints.
 * 3. Generate a UUID-like platformKpiSnapshotId that is extremely unlikely to
 *    exist.
 * 4. Call GET /shoppingMall/admin/analytics/platformKpiSnapshots/{id} with this
 *    non-existent id and validate, via TestValidator.error, that the backend
 *    throws some error (in a real, non-simulate environment).
 * 5. Additionally, perform a positive-detail fetch with a random id and use
 *    typia.assert plus basic predicates to ensure the snapshot response shape
 *    is correct when the endpoint succeeds (especially useful in simulate mode
 *    where not-found may not be reproduced).
 */
export async function test_api_admin_platform_kpi_snapshot_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Admin joins the system and obtains authorization context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create at least one global config to mimic real-world state.
  const configPayload = {
    namespace: "analytics",
    config_key: "platform-kpi-thresholds",
    environment: "test",
    description: "E2E test config for platform KPI snapshot not-found test",
    value_json: JSON.stringify({
      gmvm_threshold: 100000,
      nmv_threshold: 50000,
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configPayload,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Generate a UUID-format snapshot id that should not exist.
  const missingSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Expect error when fetching KPI snapshot detail with non-existent ID.
  await TestValidator.error(
    "admin snapshot detail should fail for non-existent id",
    async () => {
      await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.at(
        connection,
        {
          platformKpiSnapshotId: missingSnapshotId,
        },
      );
    },
  );

  // 5. Sanity check: successful KPI snapshot retrieval and basic metric checks.
  const arbitrarySnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const snapshot: IShoppingMallPlatformKpiSnapshot =
    await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.at(
      connection,
      {
        platformKpiSnapshotId: arbitrarySnapshotId,
      },
    );
  typia.assert<IShoppingMallPlatformKpiSnapshot>(snapshot);

  TestValidator.predicate(
    "order_count should be non-negative",
    () => snapshot.order_count >= 0,
  );
  TestValidator.predicate(
    "paid_order_count should be non-negative",
    () => snapshot.paid_order_count >= 0,
  );
}
