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
 * Verify that member user password change enforces complexity and updates
 * authentication behavior.
 *
 * Business workflow under test:
 *
 * 1. Register a new member user via POST /auth/memberUser/join and obtain
 *    ITodoAppMemberuser.IAuthorized, letting the SDK attach the access token to
 *    the connection.
 * 2. While authenticated as this member user, attempt to change the password via
 *    PUT /auth/memberUser/password using the correct currentPassword but a
 *    conceptually weak newPassword. The test expects this call to fail as a
 *    business error (rejected by server-side complexity rules) and uses
 *    TestValidator.error to assert that an error is thrown.
 * 3. Perform a second password change with a stronger newPassword that should
 *    comply with policy. This time the call must succeed and return
 *    ITodoAppMemberUserChangePassword.IResponse with success === true.
 * 4. Attempt login via POST /auth/memberUser/login with the old password and
 *    assert that it now fails (TestValidator.error), confirming that the
 *    original password_hash is no longer valid.
 * 5. Attempt login again with the new password and assert that it succeeds and
 *    returns ITodoAppMemberuser.IAuthorized whose email matches the original
 *    registration, proving that the new password is the only valid credential.
 */
export async function test_api_member_user_change_password_enforces_complexity_rules(
  connection: api.IConnection,
) {
  // 1. Register a new member user and get authorized context
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const initialPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password: initialPassword,
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

  // 2. Attempt password change with a conceptually weak new password
  const weakNewPassword: string = "123456";

  await TestValidator.error(
    "password change fails for weak password candidate",
    async () => {
      const weakChangeBody = {
        currentPassword: initialPassword,
        newPassword: weakNewPassword,
      } satisfies ITodoAppMemberUserChangePassword.IRequest;

      const weakResponse: ITodoAppMemberUserChangePassword.IResponse =
        await api.functional.auth.memberUser.password.changePassword(
          connection,
          {
            body: weakChangeBody,
          },
        );
      typia.assert(weakResponse);
    },
  );

  // 3. Attempt password change with a strong password that should be accepted
  const strongNewPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const strongChangeBody = {
    currentPassword: initialPassword,
    newPassword: strongNewPassword,
  } satisfies ITodoAppMemberUserChangePassword.IRequest;

  const strongChangeResponse: ITodoAppMemberUserChangePassword.IResponse =
    await api.functional.auth.memberUser.password.changePassword(connection, {
      body: strongChangeBody,
    });
  typia.assert(strongChangeResponse);

  TestValidator.equals(
    "password change success flag should be true for strong password",
    strongChangeResponse.success,
    true,
  );

  // 4. Verify old password no longer works for login
  await TestValidator.error(
    "login with old password must fail after successful password change",
    async () => {
      const oldLoginBody = {
        email,
        password: initialPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMemberUserLogin.IRequest;

      const oldLogin: ITodoAppMemberuser.IAuthorized =
        await api.functional.auth.memberUser.login(connection, {
          body: oldLoginBody,
        });
      typia.assert(oldLogin);
    },
  );

  // 5. Verify new password works for login
  const newLoginBody = {
    email,
    password: strongNewPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const newLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: newLoginBody,
    });
  typia.assert(newLogin);

  TestValidator.equals(
    "login with new password should return same email as registered",
    newLogin.email,
    email,
  );
}
