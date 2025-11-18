import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberuser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserChangePassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserChangePassword";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate that member user password change fails when the current password is
 * incorrect.
 *
 * Business intent
 *
 * - Ensure PUT /auth/memberUser/password requires the correct currentPassword
 *   before updating password_hash for an authenticated member user.
 * - Verify that a failed password change attempt does not alter the stored
 *   password and that the original password remains usable for login.
 * - Optionally, confirm via admin search that the member user still exists with
 *   consistent metadata after the failed change.
 *
 * End-to-end workflow
 *
 * 1. Register a new member user via POST /auth/memberUser/join with a known email
 *    and password (captured in local variables for later reuse).
 * 2. While authenticated as this member user (join sets Authorization header),
 *    call PUT /auth/memberUser/password with
 *    ITodoAppMemberUserChangePassword.IRequest providing:
 *
 *    - CurrentPassword: an intentionally incorrect value (e.g., original +
 *         "!wrong").
 *    - NewPassword: a syntactically valid password string.
 * 3. Assert that the password change response
 *    (ITodoAppMemberUserChangePassword.IResponse) indicates failure (success
 *    === false). Do not assert on the exact message text, only that the DTO is
 *    structurally valid.
 * 4. Call POST /auth/memberUser/login with the original email and original
 *    password, and assert that login still succeeds (typia.assert on
 *    ITodoAppMemberuser.IAuthorized), confirming that the failed password
 *    change did not change credentials.
 * 5. As an admin user, join/login via /auth/adminUser/join and optionally
 *    /auth/adminUser/login, then call PATCH
 *    /todoApp/adminUser/memberUsers.index filtering by the member email.
 *    Confirm that at least one member user summary exists with that email and
 *    that its status field is present, demonstrating that the account remains
 *    intact and active.
 */
export async function test_api_member_user_change_password_invalid_current_password(
  connection: api.IConnection,
) {
  // 1. Register a new member user with explicit credentials we can reuse.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joinedMember = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedMember);

  // 2. Attempt to change password with an incorrect currentPassword.
  const wrongCurrentPassword = `${memberPassword}__wrong`;
  const newPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const changePasswordBody = {
    currentPassword: wrongCurrentPassword,
    newPassword,
  } satisfies ITodoAppMemberUserChangePassword.IRequest;

  const changeResult: ITodoAppMemberUserChangePassword.IResponse =
    await api.functional.auth.memberUser.password.changePassword(connection, {
      body: changePasswordBody,
    });
  typia.assert(changeResult);

  TestValidator.predicate(
    "password change with invalid current password must fail",
    changeResult.success === false,
  );

  // 3. Verify that original password still works via login.
  const loginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const loginResult = await api.functional.auth.memberUser.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  TestValidator.equals(
    "member email after login should match original email",
    loginResult.email,
    memberEmail,
  );

  // 4. As admin, search memberUsers list to ensure the account is present.
  const adminJoinBody =
    typia.random<ITodoAppAdminUser.IJoin>() satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  const indexBody = {
    page: 1,
    limit: 10,
    email: memberEmail,
    status: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    deleted: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies ITodoAppMemberuser.IRequest;

  const pageResult = await api.functional.todoApp.adminUser.memberUsers.index(
    connection,
    {
      body: indexBody,
    },
  );
  typia.assert(pageResult);

  TestValidator.predicate(
    "admin memberUsers index should return at least one record for member email",
    pageResult.data.some((m) => m.email === memberEmail),
  );
}
