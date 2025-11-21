import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDataChangeLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataChangeLog";

export async function test_api_admin_data_change_logs_retrieval(
  connection: api.IConnection,
) {
  // 1. Create new admin account to establish authentication context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "securePassword123";
  const adminFirstName: string = RandomGenerator.name();
  const adminLastName: string = RandomGenerator.name();
  const adminRole: "super_admin" | "full_admin" | "limited_admin" =
    "super_admin";

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: adminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Retrieve the complete pagination of data change logs
  // All operations are already authenticated via SDK connection header management
  const dataChangeLogs: IPageIShoppingMallDataChangeLog =
    await api.functional.shoppingMall.admin.data_change.logs.index(connection);
  typia.assert(dataChangeLogs);

  // 3. Validate the pagination structure
  TestValidator.equals("pagination exists", dataChangeLogs.pagination, {
    current: dataChangeLogs.pagination.current,
    limit: dataChangeLogs.pagination.limit,
    records: dataChangeLogs.pagination.records,
    pages: dataChangeLogs.pagination.pages,
  });

  // 4. Validate that data array is present and contains correct entity type
  TestValidator.predicate(
    "data array is an array",
    Array.isArray(dataChangeLogs.data),
  );
  TestValidator.predicate(
    "data array has at least one item",
    dataChangeLogs.data.length > 0,
  );

  // 5. Validate first log entity structure
  const firstLog: IShoppingMallDataChangeLog = dataChangeLogs.data[0];
  TestValidator.equals(
    "entityId is string",
    typeof firstLog.entityId,
    "string",
  );
  TestValidator.equals(
    "entityType is string",
    typeof firstLog.entityType,
    "string",
  );
  TestValidator.equals(
    "operationType is valid enum",
    ["create", "update", "delete"].includes(firstLog.operationType),
    true,
  );
  TestValidator.equals(
    "changedBy is string",
    typeof firstLog.changedBy,
    "string",
  );
  TestValidator.equals(
    "changedAt is ISO date-time format",
    typia.is<string & tags.Format<"date-time">>(firstLog.changedAt),
    true,
  );

  // 6. Validate optional oldValue and newValue properties are either objects or undefined/null
  TestValidator.predicate(
    "oldValue is object or null or undefined",
    firstLog.oldValue === null ||
      firstLog.oldValue === undefined ||
      (firstLog.oldValue !== null &&
        typeof firstLog.oldValue === "object" &&
        !Array.isArray(firstLog.oldValue)),
  );
  TestValidator.predicate(
    "newValue is object or null or undefined",
    firstLog.newValue === null ||
      firstLog.newValue === undefined ||
      (firstLog.newValue !== null &&
        typeof firstLog.newValue === "object" &&
        !Array.isArray(firstLog.newValue)),
  );

  // 7. Validate the pagination count is consistent with total records
  // Note: We don't try to validate exact count since this is a real data change log endpoint
  TestValidator.predicate(
    "pagination records >= 0",
    dataChangeLogs.pagination.records >= 0,
  );
}
