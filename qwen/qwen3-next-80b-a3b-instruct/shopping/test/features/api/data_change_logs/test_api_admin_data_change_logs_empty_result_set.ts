import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDataChangeLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDataChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataChangeLog";

export async function test_api_admin_data_change_logs_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as an admin to establish proper authorization context
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve data change logs from the system, expecting an empty result set since no logs exist
  const emptyLogs: IPageIShoppingMallDataChangeLog =
    await api.functional.shoppingMall.admin.data_change.logs.index(connection);
  typia.assert(emptyLogs);

  // Step 3: Validate the empty result set structure
  TestValidator.equals(
    "pagination should show zero records",
    emptyLogs.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should show zero pages",
    emptyLogs.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination should show current page as 0",
    emptyLogs.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination should show limit as default (likely 10)",
    emptyLogs.pagination.limit > 0,
    true,
  );
  TestValidator.equals("data array should be empty", emptyLogs.data.length, 0);
}
