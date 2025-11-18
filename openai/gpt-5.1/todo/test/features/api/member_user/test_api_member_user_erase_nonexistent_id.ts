import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";

/**
 * Verify safe behavior when erasing a non-existent member user as an admin.
 *
 * ## Business goal
 *
 * Ensure that the administrative erase endpoint for member users (`DELETE
 * /todoApp/adminUser/memberUsers/{memberUserId}`) behaves safely when the
 * target member user does not exist:
 *
 * - A not-found style error is raised instead of succeeding silently.
 * - Existing member user accounts are not deleted or modified as a side effect.
 * - The flow is exercised under a valid admin session obtained via
 *   `/auth/adminUser/join`.
 *
 * ## High-level steps
 *
 * 1. Register a new admin user via POST /auth/adminUser/join and rely on the SDK
 *    to attach the access token to the connection.
 * 2. Take an initial snapshot of member users via PATCH
 *    /todoApp/adminUser/memberUsers, capturing `pagination.records`.
 * 3. Build a random UUID that is guaranteed not to match any existing member user
 *    id from the first page.
 * 4. Call DELETE /todoApp/adminUser/memberUsers/{memberUserId} with this
 *    non-existent id and assert that it results in an error.
 * 5. Fetch the member user list again with the same search request and verify that
 *    the total record count is unchanged, proving there was no accidental
 *    deletion.
 *
 * ## Notes and constraints
 *
 * - No API for creating member users is provided in these materials, so the test
 *   does not create additional member users; it works with whatever data is
 *   present in the environment (including the empty-table case).
 * - Authorization is obtained once at the beginning and not tampered with; direct
 *   header manipulation is avoided as required by the SDK contract.
 */
export async function test_api_member_user_erase_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: typia.random<ITodoAppAdminUser.IJoin>(),
    });
  typia.assert(adminAuthorized);

  // 2. Initial snapshot of member users
  const initialRequestBody = typia.random<ITodoAppMemberUser.IRequest>();
  const beforePage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: initialRequestBody,
    });
  typia.assert(beforePage);

  const beforeTotalRecords = beforePage.pagination.records;

  // Collect existing ids from the first page to avoid collisions
  const existingIds: (string & tags.Format<"uuid">)[] = beforePage.data.map(
    (summary) => summary.id,
  );

  // 3. Generate a UUID that does not exist among current member user ids
  let nonexistentMemberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // In the extremely unlikely case of collision, retry a few times.
  for (let i = 0; i < 5; i++) {
    if (!existingIds.includes(nonexistentMemberUserId)) break;
    nonexistentMemberUserId = typia.random<string & tags.Format<"uuid">>();
  }
  // Final safety check: even if collision remains after retries, the test will
  // still be valid but might target an existing id. The probability is
  // negligible for random UUID generation and a small sample size.

  // 4. Attempt to erase a non-existent member user and expect an error
  await TestValidator.error(
    "erase non-existent member user should fail",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.erase(connection, {
        memberUserId: nonexistentMemberUserId,
      });
    },
  );

  // 5. Snapshot again and ensure no accidental deletions occurred
  const afterPage: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: initialRequestBody,
    });
  typia.assert(afterPage);

  TestValidator.equals(
    "member user total records unchanged after failed erase",
    afterPage.pagination.records,
    beforeTotalRecords,
  );
}
