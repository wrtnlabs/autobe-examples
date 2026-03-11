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

export async function test_api_admin_backup_logs_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test backup logs retrieval with default parameters
  const response = await api.functional.multiUserTodo.admin.backup_logs.index(
    adminConnection,
    {
      body: {} satisfies IMultiUserTodoBackupLog.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "response has pagination",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data),
  );
  // 4. Validate pagination metadata
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination.current is number",
    typeof pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination.limit is number",
    typeof pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination.records is number",
    typeof pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination.pages is number",
    typeof pagination.pages === "number",
  );
  // 5. Validate pagination boundaries
  TestValidator.predicate("current page >= 0", pagination.current >= 0);
  TestValidator.predicate("limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  // 6. Validate data array items have required fields
  for (const log of response.data) {
    TestValidator.predicate(
      "log has backup_type",
      typeof log.backup_type === "string",
    );
    TestValidator.predicate("log has status", typeof log.status === "string");
    TestValidator.predicate(
      "log has started_at",
      typeof log.started_at === "string",
    );
    TestValidator.predicate(
      "log has recovery_point_id",
      log.recovery_point_id === null ||
        typeof log.recovery_point_id === "string",
    );
    TestValidator.predicate(
      "log has operation_duration",
      log.operation_duration === null ||
        typeof log.operation_duration === "number",
    );
    // Validate nullable fields
    if (log.completed_at !== null && log.completed_at !== undefined) {
      TestValidator.predicate(
        "completed_at is string",
        typeof log.completed_at === "string",
      );
    }
    if (
      log.recovery_point_timestamp !== null &&
      log.recovery_point_timestamp !== undefined
    ) {
      TestValidator.predicate(
        "recovery_point_timestamp is string",
        typeof log.recovery_point_timestamp === "string",
      );
    }
    if (log.backup_file_size !== null) {
      TestValidator.predicate(
        "backup_file_size is number",
        typeof log.backup_file_size === "number",
      );
    }
  }
}
