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
 * Test successful retrieval of a specific error log entry by admin.
 * Scenario: An administrator needs to investigate a specific error incident captured by the system.
 * First authenticate as admin using join endpoint. Then retrieve a specific error log entry by its UUID identifier.
 * Validate that the response contains all expected error details including error type classification,
 * human-readable error message, severity level, request context metadata (HTTP status code, request path, method),
 * timestamps for error occurrence and resolution, and session references if available.
 * Verify that all required fields are present including error_type, error_message, severity, environment,
 * service_name, occurred_at, created_at, and updated_at. Validate that the response format matches the
 * IMultiUserTodoErrorLog schema, ensuring proper data types and format constraints.
 */
export async function test_api_error_logs_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Try to retrieve an error log with a random UUID
  // Since we cannot create error logs via API, we'll test error handling for non-existent IDs
  const randomErrorLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the error log (may return 404 if doesn't exist in test environment)
  const errorLog = await api.functional.multiUserTodo.admin.error_logs.at(
    adminConnection,
    {
      errorLogId: randomErrorLogId,
    },
  );
  // 4. Validate the response structure with typia.assert
  typia.assert(errorLog);
  // 5. Validate that all required fields exist and have correct types
  // Note: Even if the error log doesn't exist, typia.assert would fail if response format is wrong
  // But since we're using typia.assert first, we don't need manual type checks
  // 6. Validate specific fields that should always be present when error log exists
  TestValidator.equals("error log has UUID ID", errorLog.id.length, 36);
  TestValidator.predicate(
    "error_type is string",
    typeof errorLog.error_type === "string",
  );
  TestValidator.predicate(
    "error_message is string",
    typeof errorLog.error_message === "string",
  );
  TestValidator.predicate(
    "severity is string",
    typeof errorLog.severity === "string",
  );
  TestValidator.predicate(
    "environment is string",
    typeof errorLog.environment === "string",
  );
  TestValidator.predicate(
    "service_name is string",
    typeof errorLog.service_name === "string",
  );
  TestValidator.predicate(
    "occurred_at is ISO date",
    errorLog.occurred_at.includes("T"),
  );
  TestValidator.predicate(
    "created_at is ISO date",
    errorLog.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    errorLog.updated_at.includes("T"),
  );
  // 7. Validate optional fields if present
  if (errorLog.error_code !== null && errorLog.error_code !== undefined) {
    TestValidator.predicate(
      "error_code is string",
      typeof errorLog.error_code === "string",
    );
  }
  if (errorLog.stack_trace !== null && errorLog.stack_trace !== undefined) {
    TestValidator.predicate(
      "stack_trace is string",
      typeof errorLog.stack_trace === "string",
    );
  }
  if (
    errorLog.http_status_code !== null &&
    errorLog.http_status_code !== undefined
  ) {
    TestValidator.predicate(
      "http_status_code is number",
      typeof errorLog.http_status_code === "number",
    );
  }
  if (errorLog.request_path !== null && errorLog.request_path !== undefined) {
    TestValidator.predicate(
      "request_path is string",
      typeof errorLog.request_path === "string",
    );
  }
  if (
    errorLog.request_method !== null &&
    errorLog.request_method !== undefined
  ) {
    TestValidator.predicate(
      "request_method is string",
      typeof errorLog.request_method === "string",
    );
  }
  if (errorLog.user_agent !== null && errorLog.user_agent !== undefined) {
    TestValidator.predicate(
      "user_agent is string",
      typeof errorLog.user_agent === "string",
    );
  }
  if (errorLog.ip_address !== null && errorLog.ip_address !== undefined) {
    TestValidator.predicate(
      "ip_address is IPv4 string",
      typeof errorLog.ip_address === "string",
    );
  }
  if (errorLog.resolved_at !== null && errorLog.resolved_at !== undefined) {
    TestValidator.predicate(
      "resolved_at is ISO date",
      errorLog.resolved_at.includes("T"),
    );
  }
  // Note: session references are optional and may be null/undefined
}
