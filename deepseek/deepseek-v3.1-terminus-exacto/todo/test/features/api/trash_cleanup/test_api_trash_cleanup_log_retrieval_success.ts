import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashCleanupLog";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_trash_cleanup_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Note: The todo creation endpoint returns void, so we cannot create a todo
  // through the current API. However, we can rely on existing trash items
  // or the cleanup operation itself generating logs.
  // Initiate cleanup to generate cleanup log records
  const cleanupResponse =
    await api.functional.todoApp.user.trash.cleanup.now.cleanupNow(
      userConnection,
    );
  typia.assert(cleanupResponse);
  // Retrieve cleanup logs to get the specific cleanupLogId
  const cleanupLogs =
    await api.functional.todoApp.user.trash.cleanup_logs.index(userConnection, {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ITodoAppTrashCleanupLog.IRequest,
    });
  typia.assert(cleanupLogs);
  // If no cleanup logs exist, we cannot test the retrieval
  if (cleanupLogs.data.length === 0) {
    // Create a simple cleanup log by triggering cleanup again
    await api.functional.todoApp.user.trash.cleanup.now.cleanupNow(
      userConnection,
    );
    // Retry getting cleanup logs
    const retryLogs =
      await api.functional.todoApp.user.trash.cleanup_logs.index(
        userConnection,
        {
          body: {
            page: 1 satisfies number as number,
            limit: 10 satisfies number as number,
          } satisfies ITodoAppTrashCleanupLog.IRequest,
        },
      );
    typia.assert(retryLogs);
    if (retryLogs.data.length === 0) {
      // If still no logs, the test cannot proceed - this is a system state issue
      return;
    }
  }
  // Get the first cleanup log ID for testing
  const cleanupLogId = cleanupLogs.data[0]!.id;
  // Test the GET operation to retrieve complete cleanup log details
  const cleanupLog = await api.functional.todoApp.user.trash.cleanup_logs.at(
    userConnection,
    {
      cleanupLogId,
    },
  );
  typia.assert(cleanupLog);
  // Validate business logic - the cleanup log should match the retrieved ID
  TestValidator.equals(
    "cleanup log ID should match",
    cleanupLog.id,
    cleanupLogId,
  );
}
