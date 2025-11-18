import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Ensure admin-only member user detail endpoint rejects non-admin or anonymous
 * callers.
 *
 * Business intent
 *
 * - The GET /todoApp/adminUser/memberUsers/{memberUserId} endpoint is restricted
 *   to adminUser actors.
 * - A regular memberUser token must not be able to access member user details
 *   through this admin surface.
 * - Anonymous (no token) callers must also be rejected.
 *
 * Steps
 *
 * 1. Register a member user using POST /auth/memberUser/join and obtain their id
 *    and token.
 * 2. With the memberUser-authenticated connection, attempt to call the adminUser
 *    memberUsers.at endpoint.
 * 3. Assert that the call fails with an HTTP authorization error (4xx, typically
 *    401/403) and does not return ITodoAppMemberuser.
 * 4. Derive an unauthenticated connection with empty headers.
 * 5. With this unauthenticated connection, call the same adminUser memberUsers.at
 *    endpoint.
 * 6. Assert that this call also fails with an HTTP authorization error.
 */
export async function test_api_admin_member_user_detail_unauthorized_without_admin_token(
  connection: api.IConnection,
) {
  // 1. Register a regular member user (guest -> memberUser)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert(memberAuthorized);

  const targetMemberUserId = memberAuthorized.id;

  // 2. Call adminUser-only endpoint with memberUser token (should be unauthorized)
  await TestValidator.httpError(
    "memberUser token cannot access adminUser member user detail endpoint",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.at(connection, {
        memberUserId: targetMemberUserId,
      });
    },
  );

  // 3. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Call adminUser-only endpoint without any token (should also be unauthorized)
  await TestValidator.httpError(
    "anonymous caller cannot access adminUser member user detail endpoint",
    [401, 403],
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.at(
        unauthenticatedConnection,
        {
          memberUserId: targetMemberUserId,
        },
      );
    },
  );
}
