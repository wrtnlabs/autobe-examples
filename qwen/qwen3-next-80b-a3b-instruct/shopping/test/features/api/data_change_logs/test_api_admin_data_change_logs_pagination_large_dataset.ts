import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDataChangeLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataChangeLog";

export async function test_api_admin_data_change_logs_pagination_large_dataset(
  connection: api.IConnection,
) {
  // Create an admin account for authentication
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Retrieve the first page of data change logs
  const result: IPageIShoppingMallDataChangeLog =
    await api.functional.shoppingMall.admin.data_change.logs.index(connection);
  typia.assert(result);

  // Validate pagination structure matches expected format
  TestValidator.equals("pagination metadata structure", result.pagination, {
    current: result.pagination.current,
    limit: result.pagination.limit,
    records: result.pagination.records,
    pages: result.pagination.pages,
  });

  // Validate data array has elements
  TestValidator.predicate("has data change logs", result.data.length > 0);

  // Validate that the first log entry has required properties
  const firstLog = result.data[0];
  TestValidator.equals(
    "log has entityId format",
    typeof firstLog.entityId,
    "string",
  );
  TestValidator.equals(
    "log has entityType",
    typeof firstLog.entityType,
    "string",
  );
  TestValidator.equals(
    "log has operationType",
    ["create", "update", "delete"].includes(firstLog.operationType),
    true,
  );
  TestValidator.equals(
    "log has changedBy",
    typeof firstLog.changedBy,
    "string",
  );
  TestValidator.equals(
    "log has changedAt format",
    typeof firstLog.changedAt,
    "string",
  );
  if (firstLog.oldValue !== undefined) {
    TestValidator.predicate(
      "oldValue is object or null",
      firstLog.oldValue === null || typeof firstLog.oldValue === "object",
    );
  }
  if (firstLog.newValue !== undefined) {
    TestValidator.predicate(
      "newValue is object or null",
      firstLog.newValue === null || typeof firstLog.newValue === "object",
    );
  }
}
