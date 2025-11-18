import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserDeletionLog";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUserDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserDeletionLog";

/**
 * Test an admin retrieving a paged, filtered list of deletion logs for a
 * specific user.
 *
 * 1. Register and authenticate as admin
 * 2. Prepare a random user ID
 * 3. Call API with valid request, specifying orderBy:'deleted_at',
 *    orderDirection:'desc'
 * 4. Assert pagination and entry fields; all logs' user_id match the queried
 *    userId, reasons exist, actor ids are present or null, timestamps are
 *    valid
 * 5. Result is ordered descending by 'deleted_at'
 * 6. Confirm endpoint is restricted by trying with an unauthenticated connection
 *    (should error)
 */
export async function test_api_user_deletion_logs_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(admin);

  // 2. Prepare random user ID for which to audit deletion logs
  const queryUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build request
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    orderBy: "deleted_at",
    orderDirection: "desc",
  } satisfies ITodoListUserDeletionLog.IRequest;

  // 4. Call API to get deletion logs
  const logsPage: IPageITodoListUserDeletionLog.ISummary =
    await api.functional.todoList.admin.users.deletionLogs.index(connection, {
      userId: queryUserId,
      body: requestBody,
    });
  typia.assert(logsPage);
  // pagination structure asserts
  TestValidator.predicate(
    "pagination current is int32 >=0",
    typeof logsPage.pagination.current === "number" &&
      logsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is int32 >=0",
    typeof logsPage.pagination.limit === "number" &&
      logsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is int32 >=0",
    typeof logsPage.pagination.pages === "number" &&
      logsPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is int32 >=0",
    typeof logsPage.pagination.records === "number" &&
      logsPage.pagination.records >= 0,
  );

  // Each result must match queried userId, have valid fields, etc
  let lastDeletedAt: string | undefined = undefined;
  for (const dlog of logsPage.data) {
    typia.assert(dlog);
    TestValidator.equals(
      "log's user_id matches filter",
      dlog.user_id,
      queryUserId,
    );
    TestValidator.predicate(
      "deletion reason is non-empty string",
      typeof dlog.reason === "string" && dlog.reason.length > 0,
    );
    TestValidator.predicate(
      "deleted_at is ISO 8601 string",
      typeof dlog.deleted_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dlog.deleted_at),
    );
    // deleted_by_admin_id allowed to be null (self-deletion), else UUID
    if (
      dlog.deleted_by_admin_id !== null &&
      dlog.deleted_by_admin_id !== undefined
    )
      TestValidator.predicate(
        "deleted_by_admin_id is UUID",
        typeof dlog.deleted_by_admin_id === "string" &&
          /^[0-9a-f\-]{36}$/i.test(dlog.deleted_by_admin_id),
      );
    // Check descending ordering by deleted_at
    if (lastDeletedAt !== undefined) {
      TestValidator.predicate(
        "deleted_at is descending",
        dlog.deleted_at <= lastDeletedAt,
      );
    }
    lastDeletedAt = dlog.deleted_at;
  }

  // 5. Attempt with unauthenticated connection (should be restricted)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "admin-only endpoint enforces access control",
    async () => {
      await api.functional.todoList.admin.users.deletionLogs.index(unauthConn, {
        userId: queryUserId,
        body: requestBody,
      });
    },
  );
}
