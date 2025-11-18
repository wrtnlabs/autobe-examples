import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminDeletionLog";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminDeletionLog";

/**
 * Comprehensive E2E test for admin deletion log search and listing endpoint.
 *
 * This function:
 *
 * 1. Registers (joins) a new admin and authenticates as this admin (used for all
 *    subsequent operations).
 * 2. Performs a deletion log search using advanced filter parameters and validates
 *    correct pagination and response structure.
 * 3. Attempts an unauthenticated search and validates that access is denied.
 * 4. Validates empty search (edge-case filters) and pagination constraints.
 */
export async function test_api_admin_deletion_log_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register & authenticate a new admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Perform search as authenticated admin, filling filters (adminId, reason, deletedByAdminId, time window, page, limit)
  const filter = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    deleted_by_admin_id: admin.id,
    time_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    time_to: new Date().toISOString(),
    query: undefined,
  } satisfies ITodoListAdminDeletionLog.IRequest;
  const logsPage =
    await api.functional.todoList.admin.admins.deletionLogs.index(connection, {
      adminId: admin.id,
      body: filter,
    });
  typia.assert(logsPage);
  TestValidator.equals(
    "pagination exists",
    typeof logsPage.pagination,
    "object",
  );
  TestValidator.equals("page is 1", logsPage.pagination.current, 1);
  TestValidator.equals("limit is 10", logsPage.pagination.limit, 10);

  // 3. Attempt search with unauthenticated connection (should throw error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot access deletion logs",
    async () => {
      await api.functional.todoList.admin.admins.deletionLogs.index(
        unauthConn,
        { adminId: admin.id, body: filter },
      );
    },
  );

  // 4. Edge: Page/limit & invalid filter (returns empty result)
  const emptyPage =
    await api.functional.todoList.admin.admins.deletionLogs.index(connection, {
      adminId: admin.id,
      body: {
        ...filter,
        reason: RandomGenerator.name(1), // unlikely to match
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty data set for unlikely filter",
    emptyPage.data.length,
    0,
  );
}
