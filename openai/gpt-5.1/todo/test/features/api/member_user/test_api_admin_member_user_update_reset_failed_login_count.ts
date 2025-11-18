import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_admin_member_user_update_reset_failed_login_count(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain admin authorization token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a member user with known credentials
  const memberPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 3. Perform several failed login attempts with wrong password
  const wrongPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const failedLoginBodyBase = {
    email: memberJoinBody.email,
    password: wrongPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const failedAttempts = 3;
  for (let i = 0; i < failedAttempts; i += 1) {
    await TestValidator.error(
      `memberUser wrong password login attempt ${i + 1} should fail`,
      async () => {
        await api.functional.auth.memberUser.login(connection, {
          body: failedLoginBodyBase,
        });
      },
    );
  }

  // After failed logins, Authorization header likely points to member context.
  // Re-acquire admin authorization to call admin-only memberUser endpoints.
  const adminAuthorizedAgain: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedAgain);

  // 4. As admin, read member user and ensure failed_login_count > 0
  const beforeUpdate: ITodoAppMemberuser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId,
    });
  typia.assert(beforeUpdate);

  TestValidator.predicate(
    "failed_login_count should be greater than or equal to 1 after repeated failed logins",
    beforeUpdate.failed_login_count > 0,
  );

  // 5. Admin resets failed_login_count to 0 using update endpoint
  const updateBody = {
    failed_login_count: 0,
  } satisfies ITodoAppMemberuser.IUpdate;

  const afterUpdate: ITodoAppMemberuser =
    await api.functional.todoApp.adminUser.memberUsers.update(connection, {
      memberUserId,
      body: updateBody,
    });
  typia.assert(afterUpdate);

  // 6. Validate that identity fields are preserved and failed_login_count reset
  TestValidator.equals(
    "memberUser id should remain unchanged after update",
    afterUpdate.id,
    beforeUpdate.id,
  );
  TestValidator.equals(
    "memberUser email should remain unchanged after update",
    afterUpdate.email,
    beforeUpdate.email,
  );
  TestValidator.equals(
    "failed_login_count should be reset to 0 by admin update",
    afterUpdate.failed_login_count,
    0,
  );

  // 7. Optionally: perform a successful login with correct password.
  // This will switch Authorization to the member user again.
  const successLoginBody = {
    email: memberJoinBody.email,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberAuthorizedAfterSuccess: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: successLoginBody,
    });
  typia.assert(memberAuthorizedAfterSuccess);

  // Re-acquire admin authorization one more time to confirm failed_login_count
  const adminAuthorizedFinal: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFinal);

  const finalState: ITodoAppMemberuser =
    await api.functional.todoApp.adminUser.memberUsers.at(connection, {
      memberUserId,
    });
  typia.assert(finalState);

  TestValidator.equals(
    "failed_login_count should remain 0 after successful login following admin reset",
    finalState.failed_login_count,
    0,
  );
}
