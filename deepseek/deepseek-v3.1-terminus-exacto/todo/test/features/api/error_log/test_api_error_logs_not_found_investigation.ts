import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminSession";
import type { IMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoErrorLog";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test error handling when attempting to retrieve a non-existent error log entry.
 * Scenario: An administrator tries to investigate an error log that has been cleared or never existed.
 * 1. Authenticate as admin using the admin join utility function.
 * 2. Generate a valid UUID that doesn't exist in the system.
 * 3. Attempt to retrieve the non-existent error log using the admin connection.
 * 4. Verify that the system returns an appropriate 404 error response.
 */
export async function test_api_error_logs_not_found_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a valid but non-existent UUID
  const nonExistentErrorLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent error log and expect 404 error
  await TestValidator.httpError(
    "non-existent error log should return 404",
    404,
    async () =>
      await api.functional.multiUserTodo.admin.error_logs.at(adminConnection, {
        errorLogId: nonExistentErrorLogId,
      }),
  );
}
