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

/**
 * Test admin system maintenance logs search with comprehensive filtering.
 *
 * 1. Create admin account and obtain authentication
 * 2. Test search with various filter combinations
 * 3. Validate pagination response structure
 * 4. Test filter parameters work correctly
 */
export async function test_api_system_maintenance_logs_admin_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - use utility function for admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test search without filters (get all logs)
  const allLogs =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(allLogs);
  // Validate pagination structure
  TestValidator.predicate("has pagination", allLogs.pagination !== undefined);
  TestValidator.predicate(
    "current page positive",
    allLogs.pagination.current >= 0,
  );
  TestValidator.predicate("limit positive", allLogs.pagination.limit >= 0);
  TestValidator.predicate(
    "records non-negative",
    allLogs.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", allLogs.pagination.pages >= 0);
  // 3. Test search with operation_type filter
  if (allLogs.data.length > 0) {
    const operationType = allLogs.data[0].operationType;
    const filteredByType =
      await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
        adminConnection,
        {
          body: {
            operation_type: operationType,
            page: 1 satisfies number as number,
            limit: 10 satisfies number as number,
          } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
        },
      );
    typia.assert(filteredByType);
    // Validate filtered results
    TestValidator.predicate(
      "filter by operation type returns results",
      filteredByType.data.length > 0,
    );
    TestValidator.predicate(
      "all results match operation type filter",
      filteredByType.data.every((log) => log.operationType === operationType),
    );
  }
  // 4. Test search with status filter
  const withStatus =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          status: "completed" satisfies string as string,
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(withStatus);
  // 5. Test search with admin ID filter
  const withAdminId =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          multi_user_todo_admin_id: admin.id,
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(withAdminId);
  // 6. Test search with date range filters
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const withDateRange =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          started_at_from: yesterday.toISOString(),
          started_at_to: now.toISOString(),
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(withDateRange);
  // 7. Test search with combined filters
  const combined =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          operation_type: "backup" satisfies string as string,
          status: "completed" satisfies string as string,
          page: 1 satisfies number as number,
          limit: 3 satisfies number as number,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(combined);
  // 8. Validate admin summary in log entries
  if (allLogs.data.length > 0) {
    const logEntry = allLogs.data[0];
    TestValidator.predicate(
      "log has admin property",
      logEntry.admin !== undefined,
    );
    TestValidator.predicate("admin has id", logEntry.admin.id !== undefined);
    TestValidator.predicate(
      "admin has email",
      logEntry.admin.email !== undefined,
    );
    TestValidator.predicate(
      "admin has display_name",
      logEntry.admin.display_name !== undefined,
    );
    TestValidator.predicate(
      "admin has created_at",
      logEntry.admin.created_at !== undefined,
    );
  }
  // 9. Test different pagination parameters
  const page2 =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          page: 2 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(page2);
  const smallPage =
    await api.functional.multiUserTodo.admin.system_maintenance_logs.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 1 satisfies number as number,
        } satisfies IMultiUserTodoSystemMaintenanceLog.IRequest,
      },
    );
  typia.assert(smallPage);
  // 10. Validate business logic: page size limits respected
  TestValidator.predicate(
    "page size limit respected",
    smallPage.data.length <= smallPage.pagination.limit,
  );
}
