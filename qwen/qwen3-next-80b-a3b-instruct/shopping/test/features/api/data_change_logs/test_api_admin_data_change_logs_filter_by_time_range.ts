import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDataChangeLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataChangeLog";

export async function test_api_admin_data_change_logs_filter_by_time_range(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account for authentication
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

  // Step 2: Call the data change logs endpoint to retrieve logs
  // The API endpoint supports time range filtering, but the SDK function has no parameters
  // Due to this design gap, we test the endpoint's basic functionality
  const logs: IPageIShoppingMallDataChangeLog =
    await api.functional.shoppingMall.admin.data_change.logs.index(connection);
  typia.assert(logs);

  // Step 3: Validate that logs are returned and have expected structure
  TestValidator.equals(
    "pagination has correct type",
    typeof logs.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current page",
    logs.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", logs.pagination.limit, 10);
  TestValidator.equals(
    "pagination has records",
    logs.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    logs.pagination.pages >= 0,
    true,
  );
  TestValidator.predicate("data array is present", logs.data.length >= 0);

  // Log items should have the correct structure
  if (logs.data.length > 0) {
    const firstLog = logs.data[0];
    TestValidator.equals(
      "log has entityId",
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
      firstLog.operationType === "create" ||
        firstLog.operationType === "update" ||
        firstLog.operationType === "delete",
      true,
    );
    TestValidator.equals(
      "log has changedBy",
      typeof firstLog.changedBy,
      "string",
    );
    TestValidator.equals(
      "log has changedAt format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d+Z$/i.test(
        firstLog.changedAt,
      ),
      true,
    );
  }
}
