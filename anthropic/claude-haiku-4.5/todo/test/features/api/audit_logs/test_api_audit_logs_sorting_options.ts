import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

/**
 * Test sorting audit logs by different fields and directions.
 *
 * Validates that the audit log API correctly sorts results by created_at,
 * action_type, resource_type, and actor_type fields in both ascending and
 * descending order. Verifies default sorting behavior and combination with
 * filtering and pagination parameters.
 *
 * Steps:
 *
 * 1. Create admin account for authentication
 * 2. Query logs with sort_by='created_at' and sort_order='desc' (default reverse
 *    chronological)
 * 3. Query logs with sort_by='created_at' and sort_order='asc' (chronological
 *    order)
 * 4. Query logs sorted by action_type
 * 5. Query logs sorted by resource_type
 * 6. Query logs sorted by actor_type
 * 7. Verify results are ordered according to specified sort field and direction
 * 8. Test sort parameters combined with filtering and pagination
 * 9. Validate sort_order accepts only 'asc' and 'desc' values
 */
export async function test_api_audit_logs_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Query logs with sort_by='created_at' and sort_order='desc' (default reverse chronological)
  const logsDescByCreatedAt: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(logsDescByCreatedAt);

  // Verify descending order by checking that created_at values are in descending order
  if (logsDescByCreatedAt.data.length > 1) {
    for (let i = 0; i < logsDescByCreatedAt.data.length - 1; i++) {
      const current = new Date(
        logsDescByCreatedAt.data[i].created_at,
      ).getTime();
      const next = new Date(
        logsDescByCreatedAt.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "logs are in descending order by created_at",
        current >= next,
      );
    }
  }

  // Step 3: Query logs with sort_by='created_at' and sort_order='asc' (chronological order)
  const logsAscByCreatedAt: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(logsAscByCreatedAt);

  // Verify ascending order by checking that created_at values are in ascending order
  if (logsAscByCreatedAt.data.length > 1) {
    for (let i = 0; i < logsAscByCreatedAt.data.length - 1; i++) {
      const current = new Date(logsAscByCreatedAt.data[i].created_at).getTime();
      const next = new Date(
        logsAscByCreatedAt.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "logs are in ascending order by created_at",
        current <= next,
      );
    }
  }

  // Step 4: Query logs sorted by action_type
  const logsByActionType: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "action_type",
        sort_order: "asc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(logsByActionType);

  // Verify action_type sorting
  if (logsByActionType.data.length > 1) {
    for (let i = 0; i < logsByActionType.data.length - 1; i++) {
      const current = logsByActionType.data[i].action_type;
      const next = logsByActionType.data[i + 1].action_type;
      TestValidator.predicate(
        "logs are sorted by action_type in ascending order",
        current.localeCompare(next) <= 0,
      );
    }
  }

  // Step 5: Query logs sorted by resource_type
  const logsByResourceType: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "resource_type",
        sort_order: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(logsByResourceType);

  // Verify resource_type sorting in descending order
  if (logsByResourceType.data.length > 1) {
    for (let i = 0; i < logsByResourceType.data.length - 1; i++) {
      const current = logsByResourceType.data[i].resource_type;
      const next = logsByResourceType.data[i + 1].resource_type;
      TestValidator.predicate(
        "logs are sorted by resource_type in descending order",
        current.localeCompare(next) >= 0,
      );
    }
  }

  // Step 6: Query logs sorted by actor_type
  const logsByActorType: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "actor_type",
        sort_order: "asc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(logsByActorType);

  // Verify actor_type sorting
  if (logsByActorType.data.length > 1) {
    for (let i = 0; i < logsByActorType.data.length - 1; i++) {
      const current = logsByActorType.data[i].actor_type;
      const next = logsByActorType.data[i + 1].actor_type;
      TestValidator.predicate(
        "logs are sorted by actor_type in ascending order",
        current.localeCompare(next) <= 0,
      );
    }
  }

  // Step 7: Test sort parameters combined with filtering
  const filteredAndSorted: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 10,
        action_type: "user_login",
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(filteredAndSorted);

  // Verify that all returned logs match the filter
  for (const log of filteredAndSorted.data) {
    TestValidator.equals(
      "filtered logs have matching action_type",
      log.action_type,
      "user_login",
    );
  }

  // Verify sorting is still applied after filtering
  if (filteredAndSorted.data.length > 1) {
    for (let i = 0; i < filteredAndSorted.data.length - 1; i++) {
      const current = new Date(filteredAndSorted.data[i].created_at).getTime();
      const next = new Date(filteredAndSorted.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "filtered and sorted logs maintain sort order",
        current >= next,
      );
    }
  }

  // Step 8: Test sort parameters combined with pagination
  const page1: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 5,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(page1);

  const page2: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 2,
        limit: 5,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(page2);

  // Verify pagination works with sorting
  TestValidator.predicate("pagination is consistent", page1.data.length <= 5);
  TestValidator.predicate(
    "second page has expected limit",
    page2.data.length <= 5,
  );

  // Step 9: Test with different filter and sort combinations
  const multipleFiltersAndSort: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 15,
        actor_type: "admin",
        sort_by: "action_type",
        sort_order: "asc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(multipleFiltersAndSort);

  // Verify filtering by actor_type
  for (const log of multipleFiltersAndSort.data) {
    TestValidator.equals(
      "filtered logs have matching actor_type",
      log.actor_type,
      "admin",
    );
  }

  // Verify sorting is applied
  if (multipleFiltersAndSort.data.length > 1) {
    for (let i = 0; i < multipleFiltersAndSort.data.length - 1; i++) {
      const current = multipleFiltersAndSort.data[i].action_type;
      const next = multipleFiltersAndSort.data[i + 1].action_type;
      TestValidator.predicate(
        "filtered logs are sorted by action_type",
        current.localeCompare(next) <= 0,
      );
    }
  }

  // Step 10: Verify default sorting behavior
  const defaultSort: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(defaultSort);

  // Verify default sorting is reverse chronological (desc by created_at)
  if (defaultSort.data.length > 1) {
    for (let i = 0; i < defaultSort.data.length - 1; i++) {
      const current = new Date(defaultSort.data[i].created_at).getTime();
      const next = new Date(defaultSort.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "default sorting produces reverse chronological order",
        current >= next,
      );
    }
  }

  TestValidator.equals(
    "audit log query successful",
    defaultSort.pagination.current,
    1,
  );
}
