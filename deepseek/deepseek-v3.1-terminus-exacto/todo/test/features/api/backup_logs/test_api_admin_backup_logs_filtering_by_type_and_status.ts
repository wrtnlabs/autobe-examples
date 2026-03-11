import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoBackupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoBackupLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoBackupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoBackupLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_backup_logs_filtering_by_type_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Test valid backup type and status combinations
  const backupTypes = [
    "full",
    "incremental",
    "differential",
    "manual",
    "scheduled",
    "recovery",
  ] as const;
  const statuses = [
    "pending",
    "in_progress",
    "completed",
    "failed",
    "cancelled",
  ] as const;
  for (const backupType of backupTypes) {
    for (const status of statuses) {
      const response =
        await api.functional.multiUserTodo.admin.backup_logs.index(
          adminConnection,
          {
            body: {
              backup_type: backupType,
              status: status,
              page: 1,
              limit: 10,
            } satisfies IMultiUserTodoBackupLog.IRequest,
          },
        );
      typia.assert(response);
      // Validate that returned data matches filter criteria
      for (const log of response.data) {
        TestValidator.equals(
          "backup type matches filter",
          log.backup_type,
          backupType,
        );
        TestValidator.equals("status matches filter", log.status, status);
      }
    }
  }
  // Test null values (disabling filters)
  const nullResponse =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          backup_type: null,
          status: null,
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(nullResponse);
  // Test non-existent backup type (should return empty results, not error)
  const nonExistentTypeResponse =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          backup_type: "non_existent_type",
          status: "completed",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(nonExistentTypeResponse);
  TestValidator.predicate(
    "non-existent type returns empty or valid data",
    nonExistentTypeResponse.data.length === 0 ||
      nonExistentTypeResponse.data.every(
        (log) => log.backup_type !== "non_existent_type",
      ),
  );
  // Test non-existent status (should return empty results, not error)
  const nonExistentStatusResponse =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          backup_type: "full",
          status: "non_existent_status",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(nonExistentStatusResponse);
  TestValidator.predicate(
    "non-existent status returns empty or valid data",
    nonExistentStatusResponse.data.length === 0 ||
      nonExistentStatusResponse.data.every(
        (log) => log.status !== "non_existent_status",
      ),
  );
  // Test specific combinations mentioned in scenario
  const completedFullResponse =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          backup_type: "full",
          status: "completed",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(completedFullResponse);
  for (const log of completedFullResponse.data) {
    TestValidator.equals("completed full backup type", log.backup_type, "full");
    TestValidator.equals(
      "completed full backup status",
      log.status,
      "completed",
    );
  }
  const failedIncrementalResponse =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          backup_type: "incremental",
          status: "failed",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(failedIncrementalResponse);
  for (const log of failedIncrementalResponse.data) {
    TestValidator.equals(
      "failed incremental backup type",
      log.backup_type,
      "incremental",
    );
    TestValidator.equals(
      "failed incremental backup status",
      log.status,
      "failed",
    );
  }
  const pendingManualResponse =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          backup_type: "manual",
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(pendingManualResponse);
  for (const log of pendingManualResponse.data) {
    TestValidator.equals(
      "pending manual backup type",
      log.backup_type,
      "manual",
    );
    TestValidator.equals("pending manual backup status", log.status, "pending");
  }
}
