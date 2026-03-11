import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUptimeMonitoring";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoUptimeMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUptimeMonitoring";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the primary success path for system administrators viewing uptime monitoring records.
 * This scenario validates that administrators can retrieve a paginated list of monitoring
 * records with default parameters.
 */
export async function test_api_uptime_monitoring_system_health_overview(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call uptime monitoring API with empty request body (default parameters)
  const response =
    await api.functional.multiUserTodo.admin.uptime_monitorings.index(
      adminConnection,
      {
        body: {} satisfies IMultiUserTodoUptimeMonitoring.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination structure exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 5. Validate each monitoring record
  for (const record of response.data) {
    // typia.assert already validated the structure, but we can test business logic
    TestValidator.predicate(
      "service name is string",
      typeof record.service_name === "string",
    );
    TestValidator.predicate(
      "is_healthy is boolean",
      typeof record.is_healthy === "boolean",
    );
    TestValidator.predicate(
      "response_time_ms is integer",
      Number.isInteger(record.response_time_ms),
    );
    TestValidator.predicate(
      "uptime_percentage is number",
      typeof record.uptime_percentage === "number",
    );
    TestValidator.predicate(
      "created_at is valid ISO string",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(record.created_at),
    );
  }
}
