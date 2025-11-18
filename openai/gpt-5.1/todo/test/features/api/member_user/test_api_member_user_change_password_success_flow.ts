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
 * Validate successful password change flow for an authenticated member user.
 *
 * Business workflow:
 *
 * 1. Register a new member user with a known email and initial password using join
 *    API.
 * 2. While authenticated as this member user, invoke changePassword with correct
 *    currentPassword and a strong newPassword.
 * 3. Verify the changePassword response indicates success.
 * 4. Confirm that logging in with the old password now fails.
 * 5. Confirm that logging in with the new password succeeds and returns a valid
 *    authorized payload whose id/email match the original user.
 */
export async function test_api_member_user_change_password_success_flow(
  connection: api.IConnection,
) {
  // 1. Register a new member user with known credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const initialPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password: initialPassword,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joined: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Change password using correct current password
  const newPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const changePasswordBody = {
    currentPassword: initialPassword,
    newPassword,
  } satisfies ITodoAppMemberUserChangePassword.IRequest;

  const changeResult: ITodoAppMemberUserChangePassword.IResponse =
    await api.functional.auth.memberUser.password.changePassword(connection, {
      body: changePasswordBody,
    });
  typia.assert(changeResult);
  TestValidator.predicate(
    "password change success flag should be true",
    changeResult.success === true,
  );

  // 3. Attempt login with old password - must fail
  const oldLoginBody = {
    email,
    password: initialPassword,
    href: "https://example.com/login",
    referrer: "https://example.com/profile",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  await TestValidator.error("login with old password must fail", async () => {
    await api.functional.auth.memberUser.login(connection, {
      body: oldLoginBody,
    });
  });

  // 4. Login with new password - must succeed
  const newLoginBody = {
    email,
    password: newPassword,
    href: "https://example.com/login",
    referrer: "https://example.com/profile",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const reAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: newLoginBody,
    });
  typia.assert(reAuthorized);

  // Validate identity continuity
  TestValidator.equals(
    "re-authorized user id must match original",
    reAuthorized.id,
    joined.id,
  );
  TestValidator.equals(
    "re-authorized user email must match original",
    reAuthorized.email,
    joined.email,
  );
}
