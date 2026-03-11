import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoErrorLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_logs_admin_monitoring_basic(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Call error logs endpoint without filters
  const result = await api.functional.multiUserTodo.admin.error_logs.index(
    adminConnection,
    {
      body: {} satisfies IMultiUserTodoErrorLog.IRequest,
    },
  );
  typia.assert(result);
  // Step 3: Validate pagination metadata
  TestValidator.equals("pagination exists", typeof result.pagination, "object");
  TestValidator.predicate("current page >= 0", result.pagination.current >= 0);
  TestValidator.predicate("limit >= 0", result.pagination.limit >= 0);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
  // Step 4: Validate data array structure
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  // Step 5: Validate each error log summary
  for (const errorLog of result.data) {
    TestValidator.equals("id is string", typeof errorLog.id, "string");
    TestValidator.predicate(
      "id matches UUID pattern",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        errorLog.id,
      ),
    );
    TestValidator.equals(
      "error_type is string",
      typeof errorLog.error_type,
      "string",
    );
    TestValidator.equals(
      "error_message is string",
      typeof errorLog.error_message,
      "string",
    );
    TestValidator.predicate(
      "error_message length <= 200",
      errorLog.error_message.length <= 200,
    );
    TestValidator.equals(
      "severity is string",
      typeof errorLog.severity,
      "string",
    );
    TestValidator.equals(
      "service_name is string",
      typeof errorLog.service_name,
      "string",
    );
    TestValidator.equals(
      "environment is string",
      typeof errorLog.environment,
      "string",
    );
    TestValidator.equals(
      "occurred_at is string",
      typeof errorLog.occurred_at,
      "string",
    );
    TestValidator.predicate(
      "occurred_at is ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(errorLog.occurred_at),
    );
    if (errorLog.resolved_at !== null) {
      TestValidator.equals(
        "resolved_at is string when not null",
        typeof errorLog.resolved_at,
        "string",
      );
      TestValidator.predicate(
        "resolved_at is ISO format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(errorLog.resolved_at),
      );
    }
  }
}
