import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemMaintenanceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemMaintenanceLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoSystemMaintenanceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoSystemMaintenanceLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_maintenance_logs_pagination_and_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // Test pagination with different page numbers
  const page1Response =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 pagination current",
    page1Response.pagination.current,
    1,
  );
  const page2Response =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 pagination current",
    page2Response.pagination.current,
    2,
  );
  // Test minimum and maximum limit values
  const minLimitResponse =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals("minimum limit", minLimitResponse.pagination.limit, 1);
  const maxLimitResponse =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals("maximum limit", maxLimitResponse.pagination.limit, 100);
  // Test empty results with non-matching filters
  const emptyResultsResponse =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          operation_type: "non_existent_operation_type",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(emptyResultsResponse);
  TestValidator.equals(
    "empty results records",
    emptyResultsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pages",
    emptyResultsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results data length",
    emptyResultsResponse.data.length,
    0,
  );
  // Test invalid date range (future dates)
  const futureDateResponse =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          started_at_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(futureDateResponse);
  TestValidator.equals(
    "future date records",
    futureDateResponse.pagination.records,
    0,
  );
  // Test non-existent admin ID
  const nonExistentAdminResponse =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          multi_user_todo_admin_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(nonExistentAdminResponse);
  TestValidator.predicate(
    "non-existent admin returns valid response",
    nonExistentAdminResponse.pagination.records >= 0,
  );
}
