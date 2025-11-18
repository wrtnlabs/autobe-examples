import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserStatus";

/**
 * Validate that member user status update rejects invalid transitions/values
 * and preserves the original record when validation fails.
 *
 * Business intent:
 *
 * - An admin can update ITodoAppMemberUser.status through PUT
 *   /todoApp/adminUser/memberUsers/{memberUserId}/status.
 * - The backend must validate the requested status value and transition.
 * - When an invalid/unsupported status is requested, the API should fail and must
 *   not change the member's status or updated_at.
 *
 * Test flow:
 *
 * 1. Register and authenticate an admin via POST /auth/adminUser/join.
 *
 *    - Use ITodoAppAdminUser.IJoin with realistic random values.
 *    - After the call, the SDK sets Authorization on the connection.
 * 2. Search for existing member users via PATCH /todoApp/adminUser/memberUsers
 *    using a broad ITodoAppMemberUser.IRequest filter.
 *
 *    - If there are no member users, return early (cannot exercise status update
 *         without any target row).
 * 3. Pick one member user from the page and fetch full details via GET
 *    /todoApp/adminUser/memberUsers/{memberUserId}.
 *
 *    - Capture originalStatus = member.status and originalUpdatedAt =
 *         member.updated_at.
 * 4. Attempt to update the member's status to an obviously invalid/unsupported
 *    value using PUT /todoApp/adminUser/memberUsers/{memberUserId}/status.
 *
 *    - Build ITodoAppMemberUserStatus.IUpdate with a string such as
 *         "invalid-status-<random>" so that a backend enforcing a whitelist or
 *         transition rules will reject it.
 *    - Wrap the call in await TestValidator.error(...) with an async closure to
 *         assert that the request fails at runtime (any error is acceptable).
 *    - We do not assert specific HTTP status codes or error bodies.
 * 5. Fetch the member user again via GET /todoApp/adminUser/memberUsers/{id}.
 *
 *    - Assert that status is still originalStatus.
 *    - Assert that updated_at is still originalUpdatedAt, so the failed update has
 *         not mutated the record.
 */
export async function test_api_member_user_status_update_invalid_transition(
  connection: api.IConnection,
) {
  // 1. Register/authenticate an admin user so that we can call admin endpoints.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!123" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/signup" as string & tags.Format<"uri">,
    referrer: "https://admin.todo-app.test/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Search member users as admin.
  const searchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ITodoAppMemberUser.IRequest;

  const page: IPageITodoAppMemberUser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: searchRequest,
    });
  typia.assert(page);

  // If there is no member user, we cannot test a status update.
  if (page.data.length === 0) return;

  const targetSummary: ITodoAppMemberUser.ISummary = page.data[0];

  // 3. Load full member user details for baseline status and updated_at.
  const before: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: targetSummary.id,
    });
  typia.assert(before);

  const originalStatus: string = before.status;
  const originalUpdatedAt: string = before.updated_at;

  // 4. Attempt an invalid/unsupported status update and expect an error.
  const invalidStatus = `invalid-status-${RandomGenerator.alphaNumeric(8)}`;
  const invalidUpdateBody = {
    status: invalidStatus,
  } satisfies ITodoAppMemberUserStatus.IUpdate;

  await TestValidator.error(
    "invalid or unsupported member status value must be rejected",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.status.update(
        connection,
        {
          memberUserId: before.id,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 5. Re-fetch the member and verify that status/updated_at are unchanged.
  const after: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId: before.id,
    });
  typia.assert(after);

  TestValidator.equals(
    "member status must remain unchanged after rejected status update",
    after.status,
    originalStatus,
  );

  TestValidator.equals(
    "member updated_at must remain unchanged after rejected status update",
    after.updated_at,
    originalUpdatedAt,
  );
}
