import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate that updating a member user via the admin-only endpoint is rejected
 * when the caller is either unauthenticated or authenticated only as a member
 * user (not an admin user).
 *
 * Business intent
 *
 * - The PUT /todoApp/adminUser/memberUsers/{memberUserId} endpoint is reserved
 *   for adminUser actors. Regular member users or guests must not be able to
 *   update member accounts through this route.
 * - This test demonstrates that:
 *
 *   1. A completely unauthenticated call fails.
 *   2. A call authenticated as a memberUser (not adminUser) also fails.
 *
 * High-level steps
 *
 * 1. Create a base unauthenticated connection (guest) from the provided connection
 *    argument by stripping its headers. This will simulate a request with no
 *    Authorization header.
 * 2. Using a cloned connection dedicated to the memberUser actor, call POST
 *    /auth/memberUser/join to create a member user. The join call will set the
 *    memberUser token on that cloned connection.
 * 3. Prepare a deterministic ITodoAppMemberuser.IUpdate payload that attempts to
 *    change editable fields like display_name, status, and failed_login_count.
 * 4. Negative case A (guest): Using the unauthenticated connection, call
 *    api.functional.todoApp.adminUser.memberUsers.update with the target
 *    memberUserId and update payload wrapped in TestValidator.error, asserting
 *    that an error is thrown (without asserting specific status codes).
 * 5. Negative case B (memberUser token): Using the memberUser-authenticated
 *    connection, call the same update function again, also expecting an error.
 *    This validates that memberUser tokens are not sufficient to access
 *    admin-only member management APIs.
 * 6. Because we lack an exposed GET adminUser/memberUsers API in the provided SDK,
 *    we do not attempt to re-read the member user record to check persistence.
 *    The absence of a successful update response plus the thrown errors in both
 *    scenarios is sufficient to validate the access control behavior within the
 *    constraints of available APIs.
 */
export async function test_api_admin_member_user_update_unauthorized_without_admin_token(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated base connection (guest).
  //    This connection should not have any Authorization header set and will
  //    be used to simulate calls without any auth token.
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Prepare a separate connection object for memberUser operations so that
  //    its Authorization header can be mutated by join() without affecting the
  //    guest connection.
  const memberConnection: api.IConnection = { ...connection };

  // 3. Register a new member user via POST /auth/memberUser/join.
  //    This call both creates the member record and sets the memberUser token
  //    on memberConnection.headers.Authorization.
  const memberJoinBody = typia.random<ITodoAppMemberUserJoin.IRequest>();
  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(memberConnection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const targetMemberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 4. Prepare an ITodoAppMemberuser.IUpdate payload that attempts to change
  //    editable fields on the member account.
  const updateBody = {
    display_name: RandomGenerator.name(),
    status: "suspended",
    failed_login_count: typia.random<number & tags.Type<"int32">>(),
  } satisfies ITodoAppMemberuser.IUpdate;

  // 5. Negative case A: Unauthenticated (guest) call must be rejected.
  await TestValidator.error(
    "unauthenticated caller cannot update member user via admin endpoint",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.update(
        guestConnection,
        {
          memberUserId: targetMemberUserId,
          body: updateBody,
        },
      );
    },
  );

  // 6. Negative case B: memberUser-authenticated call must also be rejected
  //    because the endpoint is restricted to adminUser actors.
  await TestValidator.error(
    "memberUser-authenticated caller cannot use admin member update endpoint",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.update(
        memberConnection,
        {
          memberUserId: targetMemberUserId,
          body: updateBody,
        },
      );
    },
  );
}
