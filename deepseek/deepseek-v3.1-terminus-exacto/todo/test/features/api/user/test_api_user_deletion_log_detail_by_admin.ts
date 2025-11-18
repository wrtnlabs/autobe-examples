import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserDeletionLog";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserDeletionLog";

/**
 * Validate that an admin can retrieve and view full details of a specific
 * deletion log record for a user as required by regulatory compliance and audit
 * demands.
 *
 * This scenario ensures that privileged admin actors can access and audit user
 * deletion logs, validate the presence and accuracy of full audit details, and
 * confirms that proper error handling occurs for invalid or non-existent log
 * records.
 *
 * Steps:
 *
 * 1. Register a new admin user via the join API
 * 2. Authenticate as this admin (join issues session)
 * 3. Prepare a test user deletion log: Fetch a page of deletion logs for a random
 *    user (with at least one log)
 * 4. Select a deletionLogId from the summary list (first log if present)
 * 5. Retrieve full details for this deletion log using the detail endpoint
 * 6. Validate the returned detail - fields (reason, deleted_at, deleted_by_admin,
 *    and user summary) match what was in the summary, and that all required
 *    fields are type-valid
 * 7. Attempt to fetch a non-existent deletionLogId (random but not real); use
 *    TestValidator.error to ensure error is thrown (404 is considered correct
 *    for missing resource)
 * 8. (If possible) Attempt unauthorized access as a non-admin actor and ensure it
 *    fails (out of scope if user login API absent)
 */
export async function test_api_user_deletion_log_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: typia.random<ITodoListAdmin.IJoin>(),
  });
  typia.assert(adminJoin);

  // 2. Use admin context (already authenticated after join)

  // 3. Prepare a test user deletion log by fetching a summary page for a user with logs
  // Since there may not be a real user, try a random UUID & fetch logs
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  const pageReq = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderBy: "deleted_at",
    orderDirection: "desc",
  } satisfies ITodoListUserDeletionLog.IRequest;

  const deletionLogPage =
    await api.functional.todoList.admin.users.deletionLogs.index(connection, {
      userId: testUserId,
      body: pageReq,
    });
  typia.assert(deletionLogPage);

  // 4. If we find a deletion log for the user, attempt to fetch details
  if (deletionLogPage.data.length > 0) {
    const summary = deletionLogPage.data[0];
    const detail = await api.functional.todoList.admin.users.deletionLogs.at(
      connection,
      {
        userId: summary.user_id,
        deletionLogId: summary.id,
      },
    );
    typia.assert(detail);
    // 5. Validate fields match summary/are present
    TestValidator.equals("log id matches", detail.id, summary.id);
    TestValidator.equals("user id matches", detail.user.id, summary.user_id);
    TestValidator.equals("reason matches", detail.reason, summary.reason);
    TestValidator.equals(
      "deleted_at matches",
      detail.deleted_at,
      summary.deleted_at,
    );
    // deleted_by_admin may be null, if present, should match
    if (summary.deleted_by_admin_id) {
      TestValidator.equals(
        "admin id matches",
        detail.deleted_by_admin?.id,
        summary.deleted_by_admin_id,
      );
    } else {
      TestValidator.equals("admin is null", detail.deleted_by_admin, null);
    }
  }

  // 6. Attempt to get a non-existent deletion log detail; should error
  const fakeDeletionLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Not found for non-existent deletion logId",
    async () => {
      await api.functional.todoList.admin.users.deletionLogs.at(connection, {
        userId: testUserId,
        deletionLogId: fakeDeletionLogId,
      });
    },
  );
}
