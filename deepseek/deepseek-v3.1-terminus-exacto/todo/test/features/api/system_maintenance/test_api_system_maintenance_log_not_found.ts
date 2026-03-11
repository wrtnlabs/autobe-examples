import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemMaintenanceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemMaintenanceLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test error handling when attempting to retrieve a non-existent maintenance log entry.
 * The scenario validates that the system returns an appropriate error response when an
 * invalid maintenanceLogId is provided. Verify that the error response includes clear
 * indication that the maintenance log was not found.
 */
export async function test_api_system_maintenance_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Generate a random UUID that doesn't exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to fetch the maintenance log with non-existent ID
  // Expected to throw HttpError with 404 status
  await TestValidator.httpError("maintenance log not found", 404, async () => {
    await api.functional.multiUserTodo.admin.system_maintenance_logs.at(
      adminConnection,
      {
        maintenanceLogId: nonExistentId,
      },
    );
  });
}
