import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserStatus";

/**
 * Verify member user status cannot be updated without admin authentication.
 *
 * Business goal: Ensure that the protected admin-only endpoint PUT
 * /todoApp/adminUser/memberUsers/{memberUserId}/status rejects requests that do
 * not carry a valid admin Authorization token, and that such failed attempts do
 * not modify the underlying member user record.
 *
 * Scenario steps:
 *
 * 1. Join an admin user via POST /auth/adminUser/join to establish an
 *    authenticated admin session on the main `connection`.
 * 2. As the authenticated admin, read a member user via GET
 *    /todoApp/adminUser/memberUsers/{memberUserId} to capture the original
 *    status.
 * 3. Derive an unauthenticated connection by shallow-cloning `connection` into
 *    `unauthConn` with `headers: {}` so that no Authorization header is
 *    present, while keeping the same host and options.
 * 4. On `unauthConn`, attempt to update the member user status with a valid
 *    ITodoAppMemberUserStatus.IUpdate payload (e.g., `{ status: "blocked" }`).
 *    This call must fail with an HTTP 401 or 403 style authorization error.
 * 5. Using the original authenticated admin connection, re-read the same member
 *    user and assert that the `status` field is unchanged compared to the
 *    original capture.
 *
 * Validation focus:
 *
 * - Authorization is required to call the status update endpoint.
 * - Unauthorized attempts do not change the `status` of the member user.
 * - Member user state is consistent before and after the unauthorized call.
 */
export async function test_api_member_user_status_update_without_authentication(
  connection: api.IConnection,
) {
  // 1. Join an admin user to establish an authenticated admin session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin@1234" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todoapp.local/login" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Load an existing member user as admin to capture original status
  //    Use a random UUID for memberUserId; in real fixtures this would
  //    correspond to a seeded member, but for simulation mode typia.random
  //    will provide a compatible DTO.
  const memberUserId = typia.random<string & tags.Format<"uuid">>();

  const originalMember: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId,
    });
  typia.assert(originalMember);

  const originalStatus: string = originalMember.status;

  // 3. Create an unauthenticated connection with empty headers
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to update status without authentication, expecting auth error
  const updateBody = {
    status: originalStatus === "active" ? "blocked" : "active",
  } satisfies ITodoAppMemberUserStatus.IUpdate;

  await TestValidator.httpError(
    "unauthenticated status update must be rejected",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.status.update(
        unauthConn,
        {
          memberUserId,
          body: updateBody,
        },
      );
    },
  );

  // 5. Re-fetch member user with authenticated admin connection
  const reloadedMember: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId,
    });
  typia.assert(reloadedMember);

  // 6. Validate that the status has not changed
  TestValidator.equals(
    "member user status must remain unchanged after unauthorized update attempt",
    reloadedMember.status,
    originalStatus,
  );
}
