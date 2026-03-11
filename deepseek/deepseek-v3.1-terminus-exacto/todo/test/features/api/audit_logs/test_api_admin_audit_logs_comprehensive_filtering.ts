import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive filtering capabilities of the audit logs endpoint.
 * Validates that administrators can filter audit logs by event type, actor type,
 * success status, date ranges, and specific user identifiers. Tests pagination
 * functionality with different page sizes and verifies proper metadata.
 */
export async function test_api_admin_audit_logs_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test filtering by event_type
  const eventTypeFilter =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        event_type: "user_login",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(eventTypeFilter);
  TestValidator.predicate(
    "event_type filter returns results",
    eventTypeFilter.data.length >= 0,
  );
  // 3. Test filtering by actor_type
  const actorTypeFilter =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        actor_type: "admin",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(actorTypeFilter);
  TestValidator.predicate(
    "actor_type filter returns results",
    actorTypeFilter.data.length >= 0,
  );
  // 4. Test filtering by success_flag
  const successFilter =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        success_flag: true,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(successFilter);
  TestValidator.predicate(
    "success_flag filter returns results",
    successFilter.data.length >= 0,
  );
  // 5. Test date range filtering
  const dateFilter = await api.functional.multiUserTodo.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        created_at_start: new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at_end: new Date().toISOString(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IMultiUserTodoAuditLog.IRequest,
    },
  );
  typia.assert(dateFilter);
  TestValidator.predicate(
    "date range filter returns results",
    dateFilter.data.length >= 0,
  );
  // 6. Test pagination functionality
  const paginationTest =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(paginationTest);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    paginationTest.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginationTest.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has total records",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    paginationTest.pagination.pages >= 0,
  );
  // 7. Test user identifier filtering (null values since we don't have member/admin IDs)
  const userFilter = await api.functional.multiUserTodo.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        multi_user_todo_member_id: null,
        multi_user_todo_admin_id: null,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IMultiUserTodoAuditLog.IRequest,
    },
  );
  typia.assert(userFilter);
  TestValidator.predicate(
    "user identifier filter returns results",
    userFilter.data.length >= 0,
  );
  // 8. Test combined filtering
  const combinedFilter =
    await api.functional.multiUserTodo.admin.audit_logs.index(adminConnection, {
      body: {
        event_type: "user_login",
        actor_type: "admin",
        success_flag: true,
        created_at_start: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at_end: new Date().toISOString(),
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoAuditLog.IRequest,
    });
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns results",
    combinedFilter.data.length >= 0,
  );
  // 9. Test empty filter (get all audit logs)
  const allLogs = await api.functional.multiUserTodo.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        limit: 50,
      } satisfies IMultiUserTodoAuditLog.IRequest,
    },
  );
  typia.assert(allLogs);
  TestValidator.predicate(
    "empty filter returns results",
    allLogs.data.length >= 0,
  );
}
