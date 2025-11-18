import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";

/**
 * Validate that member user login is rejected when the password is wrong.
 *
 * Business context:
 *
 * - A member can register (join) with an email and password and receives an
 *   authorized session with JWT tokens.
 * - When attempting to log in with the same email but an incorrect password, the
 *   system must reject the authentication attempt and must not issue new
 *   tokens.
 *
 * This test ensures:
 *
 * 1. Password verification is enforced for member user login.
 * 2. Incorrect password attempts result in an authentication failure (surface as
 *    an error from the SDK).
 * 3. No ITodoAppMemberUser.IAuthorized result (and thus no new token) is produced
 *    on failure.
 */
export async function test_api_member_user_login_with_wrong_password_rejected(
  connection: api.IConnection,
) {
  // 1. Register a new member user via /auth/memberUser/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CorrectPassword!123" as string & tags.Format<"password">,
    displayName: RandomGenerator.name(),
    // ip is optional and nullable; let backend infer it by omitting
    href: "https://todo-app.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://todo-app.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joined: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(joined);

  // 2. Attempt login with the same email but an incorrect password
  const wrongPasswordLoginBody = {
    email: joinBody.email,
    password: "DefinitelyWrongPassword!456", // incorrect password
    // ip can be omitted or null; here we omit to let backend infer
    href: "https://todo-app.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://todo-app.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppMemberUserLogin.ICreate;

  await TestValidator.error("login with wrong password must fail", async () => {
    // This call MUST throw (HttpError) and must not return ITodoAppMemberUser.IAuthorized
    await api.functional.auth.memberUser.login(connection, {
      body: wrongPasswordLoginBody,
    });
  });
}
