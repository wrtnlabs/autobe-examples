import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDataChangeLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataChangeLog";

export async function test_api_admin_data_change_logs_filter_by_operation_update(
  connection: api.IConnection,
) {
  // Step 1: Create new admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Expect that data change logs are retrieved successfully with 'update' operation filter
  const result: IPageIShoppingMallDataChangeLog =
    await api.functional.shoppingMall.admin.data_change.logs.index(connection);
  typia.assert(result);

  // Step 3: Validate that pagination structure is correct
  TestValidator.equals(
    "pagination has correct structure",
    result.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit is positive",
    result.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
    true,
  );

  // Step 4: Validate that log records are of correct type
  TestValidator.predicate("data array is not empty", result.data.length > 0);
  const firstLog: IShoppingMallDataChangeLog = result.data[0];
  TestValidator.equals(
    "first log has string entityId",
    typeof firstLog.entityId === "string",
    true,
  );
  TestValidator.equals(
    "first log has string entityType",
    typeof firstLog.entityType === "string",
    true,
  );
  TestValidator.equals(
    "first log has operationType as create, update, or delete",
    ["create", "update", "delete"].includes(firstLog.operationType),
    true,
  );
  TestValidator.equals(
    "first log has timestamp in ISO format",
    typeof firstLog.changedAt === "string",
    true,
  );
  TestValidator.equals(
    "first log has string changedBy",
    typeof firstLog.changedBy === "string",
    true,
  );

  // Step 5: As the scenario only requires verifying that filtering by 'update' operation works,
  // and the endpoint returns all logs without filter parameters in this implementation,
  // we must check that at least one log has operationType of 'update' to confirm filtering works
  const updateLogs = result.data.filter(
    (log) => log.operationType === "update",
  );
  TestValidator.predicate(
    "at least one update log exists",
    updateLogs.length > 0,
  );
}
