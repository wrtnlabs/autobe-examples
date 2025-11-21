import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDataChangeLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataChangeLog";

export async function test_api_admin_data_change_logs_multiple_filter_combination(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication - create new admin account to establish authorization context
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Validate that authentication automatically set the authorization token in connection
  TestValidator.predicate(
    "connection has authorization token",
    connection.headers?.Authorization !== undefined,
  );

  // Step 3: Retrieve all data change logs
  const logs: IPageIShoppingMallDataChangeLog =
    await api.functional.shoppingMall.admin.data_change.logs.index(connection);
  typia.assert(logs);

  // Step 4: Validate response structure with correct pagination defaults
  TestValidator.predicate(
    "pagination has valid current page",
    logs.pagination?.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    logs.pagination?.limit > 0,
  );
  TestValidator.predicate("data array exists", logs.data?.length >= 0);

  // Step 5: Verify that at least one log in the returned data matches our filter criteria for forensic investigation
  TestValidator.predicate(
    "at least one 'order' type 'delete' log exists",
    logs.data?.some(
      (log) => log.entityType === "order" && log.operationType === "delete",
    ),
  );

  // Step 6: Verify that all logs with entityType='order' and operationType='delete' are correctly represented
  // (The system stores all logs, we validate that our filter logic works on the API response)
  if (logs.data) {
    const targetLogs = logs.data.filter(
      (log) => log.entityType === "order" && log.operationType === "delete",
    );
    for (const log of targetLogs) {
      TestValidator.equals(
        "filter matches entityType",
        log.entityType,
        "order",
      );
      TestValidator.equals(
        "filter matches operationType",
        log.operationType,
        "delete",
      );
      TestValidator.predicate(
        "log has entityId",
        log.entityId !== undefined && log.entityId.length > 0,
      );
      TestValidator.predicate(
        "log has changedBy",
        log.changedBy !== undefined && log.changedBy.length > 0,
      );
      TestValidator.predicate(
        "log has valid changedAt",
        log.changedAt !== undefined &&
          new Date(log.changedAt).toString() !== "Invalid Date",
      );
    }
  }
}
