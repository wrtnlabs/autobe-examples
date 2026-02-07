import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashCleanupLog";
import type { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_trash_cleanup_log_filter_by_operation_type(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for authorization
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authorize user using SDK function
  await api.functional.todoApp.auth.user.join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Test automatic_cleanup filter
  const automaticLogs =
    await api.functional.todoApp.user.trash.cleanup_logs.index(userConnection, {
      body: {
        operation_type: "automatic_cleanup",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashCleanupLog.IRequest,
    });
  typia.assert(automaticLogs);
  // Validate that all returned logs have automatic_cleanup operation type
  for (const log of automaticLogs.data) {
    TestValidator.equals(
      "automatic cleanup operation type",
      log.operation_type,
      "automatic_cleanup",
    );
  }
  // Test manual_cleanup filter
  const manualLogs = await api.functional.todoApp.user.trash.cleanup_logs.index(
    userConnection,
    {
      body: {
        operation_type: "manual_cleanup",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashCleanupLog.IRequest,
    },
  );
  typia.assert(manualLogs);
  // Validate that all returned logs have manual_cleanup operation type
  for (const log of manualLogs.data) {
    TestValidator.equals(
      "manual cleanup operation type",
      log.operation_type,
      "manual_cleanup",
    );
  }
  // Test expired_item_removal filter
  const expiredLogs =
    await api.functional.todoApp.user.trash.cleanup_logs.index(userConnection, {
      body: {
        operation_type: "expired_item_removal",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashCleanupLog.IRequest,
    });
  typia.assert(expiredLogs);
  // Validate that all returned logs have expired_item_removal operation type
  for (const log of expiredLogs.data) {
    TestValidator.equals(
      "expired item removal operation type",
      log.operation_type,
      "expired_item_removal",
    );
  }
  // Test without operation type filter (should return all types)
  const allLogs = await api.functional.todoApp.user.trash.cleanup_logs.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTrashCleanupLog.IRequest,
    },
  );
  typia.assert(allLogs);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    allLogs.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    allLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count",
    allLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    allLogs.pagination.pages >= 0,
  );
  // Verify operation status and data integrity
  for (const log of allLogs.data) {
    TestValidator.predicate(
      "items processed non-negative",
      log.items_processed >= 0,
    );
    TestValidator.predicate(
      "items deleted non-negative",
      log.items_deleted >= 0,
    );
    TestValidator.predicate(
      "items deleted not exceed processed",
      log.items_deleted <= log.items_processed,
    );
    // Handle null completed_at for operations still in progress
    if (log.completed_at !== null) {
      TestValidator.predicate(
        "completed after started",
        new Date(log.completed_at) >= new Date(log.started_at),
      );
    }
  }
}
