import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate deletion behavior for non-existent guest user identities.
 *
 * Business goal: Ensure that when an authenticated todoAdmin attempts to delete
 * a guest user by an id that does not exist in `todo_app_guestusers`, the
 * system:
 *
 * - Fails the operation (throws an error from the SDK), and
 * - Does not delete or mutate any existing guest user records.
 *
 * Test workflow:
 *
 * 1. Register a new todoAdmin using /auth/todoAdmin/join to obtain an
 *    authenticated administrative context (SDK sets Authorization header).
 * 2. Fetch a baseline snapshot of guest users via /todoApp/todoAdmin/guestUsers
 *    (PATCH) with deterministic pagination (e.g., page=1, limit=10). Capture:
 *
 *    - The full response object as `beforePage`.
 *    - The list of guest user ids from `beforePage.data`.
 * 3. Generate a random UUID and ensure it does not collide with any id in the
 *    first page snapshot (loop until unique vs the captured id list).
 * 4. Attempt to delete this non-existent guest user via DELETE
 *    /todoApp/todoAdmin/guestUsers/{guestUserId} using
 *    api.functional.todoApp.todoAdmin.guestUsers.erase.
 *
 *    - Wrap the call inside TestValidator.error with an async callback and await the
 *         validator call so we assert that some error is thrown.
 *    - We do not inspect HTTP status or error payload; only that an error occurs for
 *         the non-existent resource.
 * 5. Re-fetch the first page of guest users with the same filter as step 2 into
 *    `afterPage`.
 * 6. Validate that there were no deletions or unintended mutations:
 *
 *    - TestValidator.equals("records count unchanged", afterPage.pagination.records,
 *         beforePage.pagination.records).
 *    - TestValidator.equals("first page ids unchanged", afterIds, beforeIds), where
 *         `beforeIds` and `afterIds` are the arrays of id strings for the first
 *         page.
 *
 * Technical notes:
 *
 * - Use ITodoAppTodoAdminJoin.IRequest for join body with typia.random.
 * - Use ITodoAppGuestUser.IRequest for guestUsers.index body with explicit page
 *   and limit to make comparisons deterministic.
 * - Use typia.assert for ITodoAppTodoAdmin.IAuthorized and
 *   IPageITodoAppGuestuser.ISummary responses.
 * - Never touch connection.headers manually; rely on the SDK for auth.
 * - Avoid any HTTP status-specific expectations; only assert that the deletion
 *   attempt fails and that data remains stable.
 */
export async function test_api_todoadmin_delete_guest_user_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin to obtain an authenticated context
  const joinBody = typia.random<ITodoAppTodoAdminJoin.IRequest>();
  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Fetch baseline guest users page (deterministic pagination)
  const beforePage: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 10 as number & tags.Type<"int32">,
      } satisfies ITodoAppGuestUser.IRequest,
    });
  typia.assert(beforePage);

  const beforeIds: (string & tags.Format<"uuid">)[] = beforePage.data.map(
    (g) => g.id,
  );

  // 3. Generate a UUID that does not collide with any id in the first page
  let nonExistingId: string & tags.Format<"uuid">;
  while (true) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    if (beforeIds.includes(candidate) === false) {
      nonExistingId = candidate;
      break;
    }
  }

  // 4. Attempt to delete the non-existent guest user and assert error
  await TestValidator.error(
    "deleting non-existent guest user must fail",
    async () => {
      await api.functional.todoApp.todoAdmin.guestUsers.erase(connection, {
        guestUserId: nonExistingId,
      });
    },
  );

  // 5. Re-fetch guest users with the same pagination filter
  const afterPage: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 10 as number & tags.Type<"int32">,
      } satisfies ITodoAppGuestUser.IRequest,
    });
  typia.assert(afterPage);

  const afterIds: (string & tags.Format<"uuid">)[] = afterPage.data.map(
    (g) => g.id,
  );

  // 6. Assert that counts and first-page ids are unchanged
  TestValidator.equals(
    "guest user records count must remain unchanged after failed delete",
    afterPage.pagination.records,
    beforePage.pagination.records,
  );

  TestValidator.equals(
    "first page guest user ids must remain unchanged after failed delete",
    afterIds,
    beforeIds,
  );
}
