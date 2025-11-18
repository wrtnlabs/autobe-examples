import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserChangePassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserChangePassword";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Ensure that changing a member user password invalidates old credentials and
 * requires re-authentication using the new password.
 *
 * Business narrative (rewritten to use only available APIs):
 *
 * - A guest registers as a new member user using /auth/memberUser/join.
 * - The member user then logs in a couple of times using /auth/memberUser/login,
 *   conceptually creating multiple sessions (although SDK only exposes the
 *   latest access token via connection.headers).
 * - While authenticated, the member user calls /auth/memberUser/password to
 *   change their password by providing the currentPassword and newPassword.
 * - After the password change, attempting to login again with the OLD password
 *   must fail (runtime error from the login API).
 * - Logging in with the NEW password must succeed and return an authorized
 *   context with the same user id and email as before.
 *
 * What this test validates:
 *
 * 1. The changePassword endpoint accepts a correct currentPassword/newPassword
 *    pair and returns ITodoAppMemberUserChangePassword.IResponse with success
 *    === true.
 * 2. After a successful password change, the old password can no longer be used
 *    for login via /auth/memberUser/login.
 * 3. The new password can be used for login and yields a valid
 *    ITodoAppMemberuser.IAuthorized context for the same account.
 *
 * Notes:
 *
 * - We do not (and must not) manipulate connection.headers directly; token
 *   handling is fully managed by the SDK join/login functions.
 * - We also do not call any non-provided memberUser-only resource APIs, so the
 *   “session invalidation” rule is approximated through the credential behavior
 *   of the login endpoint.
 */
export async function test_api_member_user_change_password_expires_all_existing_sessions(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const originalPassword: string = RandomGenerator.alphaNumeric(16);
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: originalPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joined: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Keep core identity for later comparison
  const userId = joined.id;
  const userEmail = joined.email;

  // 2. Perform additional logins with the same credentials to conceptually
  // create multiple sessions (B, C). The SDK will update connection.headers
  // automatically; we just validate responses.
  const firstReloginBody = {
    email: userEmail,
    password: originalPassword as string & tags.Format<"password">,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;
  const firstRelogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: firstReloginBody,
    });
  typia.assert(firstRelogin);
  TestValidator.equals(
    "first relogin preserves same user id",
    firstRelogin.id,
    userId,
  );

  const secondReloginBody = {
    email: userEmail,
    password: originalPassword as string & tags.Format<"password">,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;
  const secondRelogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: secondReloginBody,
    });
  typia.assert(secondRelogin);
  TestValidator.equals(
    "second relogin preserves same user id",
    secondRelogin.id,
    userId,
  );

  // 3. Change password while authenticated.
  const newPassword: string = RandomGenerator.alphaNumeric(18);
  const changeBody = {
    currentPassword: originalPassword,
    newPassword,
  } satisfies ITodoAppMemberUserChangePassword.IRequest;

  const changeResult: ITodoAppMemberUserChangePassword.IResponse =
    await api.functional.auth.memberUser.password.changePassword(connection, {
      body: changeBody,
    });
  typia.assert(changeResult);
  TestValidator.equals(
    "password change operation reports success",
    changeResult.success,
    true,
  );

  // 4. Ensure that the OLD password can no longer be used for login.
  const oldPasswordLoginBody = {
    email: userEmail,
    password: originalPassword as string & tags.Format<"password">,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  await TestValidator.error(
    "login with old password should fail after password change",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: oldPasswordLoginBody,
      });
    },
  );

  // 5. Verify that login with the NEW password succeeds and references the
  // same member user.
  const newPasswordLoginBody = {
    email: userEmail,
    password: newPassword as string & tags.Format<"password">,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const newLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: newPasswordLoginBody,
    });
  typia.assert(newLogin);

  TestValidator.equals(
    "new password login preserves user id",
    newLogin.id,
    userId,
  );
  TestValidator.equals(
    "new password login preserves email",
    newLogin.email,
    userEmail,
  );
}
