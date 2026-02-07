import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicStatus";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_status_filtering_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IShoppingMallSuperAdmin.ILogin>(),
  });
  // 2. Query system statuses with status_key filter for 'database'
  const databaseStatuses =
    await api.functional.shoppingMall.superAdmin.statuses.index(
      superAdminConnection,
      {
        body: {
          status_key: "database",
        } satisfies IShoppingMallSystematicStatus.IRequest,
      },
    );
  typia.assert(databaseStatuses);
  // 3. Query system statuses with status_key filter for 'api-gateway'
  const apiGatewayStatuses =
    await api.functional.shoppingMall.superAdmin.statuses.index(
      superAdminConnection,
      {
        body: {
          status_key: "api-gateway",
        } satisfies IShoppingMallSystematicStatus.IRequest,
      },
    );
  typia.assert(apiGatewayStatuses);
  // 4. Query system statuses with date range filter (last 24 hours)
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentStatuses =
    await api.functional.shoppingMall.superAdmin.statuses.index(
      superAdminConnection,
      {
        body: {
          updated_at_from: yesterday,
          updated_at_to: now,
        } satisfies IShoppingMallSystematicStatus.IRequest,
      },
    );
  typia.assert(recentStatuses);
  // 5. Query system statuses with current_status filter for 'healthy'
  const healthyStatuses =
    await api.functional.shoppingMall.superAdmin.statuses.index(
      superAdminConnection,
      {
        body: {
          current_status: "healthy",
        } satisfies IShoppingMallSystematicStatus.IRequest,
      },
    );
  typia.assert(healthyStatuses);
  // 6. Verify only matching statuses are returned in response
  TestValidator.predicate(
    "database statuses should have status_key 'database'",
    () => databaseStatuses.data.every((s) => (s as any).status_key === "database"),
  );
  TestValidator.predicate(
    "api-gateway statuses should have status_key 'api-gateway'",
    () => apiGatewayStatuses.data.every((s) => (s as any).status_key === "api-gateway"),
  );
  TestValidator.predicate(
    "healthy statuses should have current_status 'healthy'",
    () => healthyStatuses.data.every((s) => (s as any).current_status === "healthy"),
  );
  // 7. Verify pagination works correctly with filtered results
  TestValidator.predicate(
    "pagination should be present",
    () => databaseStatuses.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination records should match data length",
    () => databaseStatuses.pagination.records === databaseStatuses.data.length,
  );
  // 8. Test combination of multiple filters
  const combinedFilters =
    await api.functional.shoppingMall.superAdmin.statuses.index(
      superAdminConnection,
      {
        body: {
          status_key: "database",
          current_status: "healthy",
        } satisfies IShoppingMallSystematicStatus.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.predicate("combined filters should match both conditions", () =>
    combinedFilters.data.every(
      (s) => (s as any).status_key === "database" && (s as any).current_status === "healthy",
    ),
  );
}