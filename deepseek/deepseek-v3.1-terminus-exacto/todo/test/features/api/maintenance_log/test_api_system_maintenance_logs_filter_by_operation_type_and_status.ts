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

export async function test_api_system_maintenance_logs_filter_by_operation_type_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Prepare search criteria with combined filters
  const searchBody = {
    operation_type: "backup",
    status: "completed",
    // Use current time for date range filtering
    started_at_from: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    started_at_to: new Date().toISOString(),
    page: 1,
    limit: 10,
  } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest;
  // 3. Execute filtered search
  const page =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      { body: searchBody },
    );
  typia.assert(page);
  // 4. Validate pagination structure
  TestValidator.predicate("pagination present", page.pagination !== undefined);
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("limit matches", page.pagination.limit, 10);
  TestValidator.predicate("records non-negative", page.pagination.records >= 0);
  TestValidator.predicate("pages non-negative", page.pagination.pages >= 0);
  // 5. Validate each filtered result meets criteria
  for (const log of page.data) {
    TestValidator.equals(
      "operation type matches filter",
      log.operationType,
      "backup",
    );
    TestValidator.equals("status matches filter", log.status, "completed");
    // Verify admin information present
    TestValidator.predicate("admin info present", log.admin !== undefined);
    TestValidator.predicate("admin has id", typeof log.admin.id === "string");
    TestValidator.predicate(
      "admin has email",
      typeof log.admin.email === "string",
    );
    TestValidator.predicate(
      "admin has display name",
      typeof log.admin.display_name === "string",
    );
    TestValidator.predicate(
      "admin has created at",
      typeof log.admin.created_at === "string",
    );
    // Validate datetime formats
    const startedAt = new Date(log.startedAt);
    TestValidator.predicate(
      "startedAt is valid date",
      !isNaN(startedAt.getTime()),
    );
    if (log.completedAt !== null) {
      const completedAt = new Date(log.completedAt);
      TestValidator.predicate(
        "completedAt is valid date",
        !isNaN(completedAt.getTime()),
      );
    }
  }
  // 6. Test pagination with different page and limit
  const paginationTestBody = {
    ...searchBody,
    page: 2,
    limit: 5,
  } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest;
  const page2 =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      { body: paginationTestBody },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  // 7. Test validation that filtered results respect criteria
  if (page.data.length > 0) {
    TestValidator.predicate(
      "all filtered logs have correct operation type",
      page.data.every((log) => log.operationType === "backup"),
    );
    TestValidator.predicate(
      "all filtered logs have correct status",
      page.data.every((log) => log.status === "completed"),
    );
  }
}
