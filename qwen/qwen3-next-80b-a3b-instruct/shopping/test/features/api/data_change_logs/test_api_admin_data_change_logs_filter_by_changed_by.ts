import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDataChangeLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataChangeLog";

export async function test_api_admin_data_change_logs_filter_by_changed_by(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "full_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Verify we can fetch logs after admin creation
  const logs: IPageIShoppingMallDataChangeLog =
    await api.functional.shoppingMall.admin.data_change.logs.index(connection);
  typia.assert(logs);

  // Validate that at least one log entry exists for the created admin
  const adminLogs = logs.data.filter((log) => log.changedBy === admin.id);
  TestValidator.predicate(
    "admin should have at least one data change log",
    adminLogs.length > 0,
  );

  // Validate the first log entry relates to the admin creation
  const firstAdminLog = adminLogs[0];
  TestValidator.equals(
    "log operation type should be create",
    firstAdminLog.operationType,
    "create",
  );
  TestValidator.equals(
    "log entity type should be admin",
    firstAdminLog.entityType,
    "admin",
  );
  TestValidator.equals(
    "log changedBy should match admin id",
    firstAdminLog.changedBy,
    admin.id,
  );
}
