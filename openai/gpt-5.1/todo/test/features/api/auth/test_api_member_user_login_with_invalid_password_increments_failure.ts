import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_member_user_login_with_invalid_password_increments_failure(
  connection: api.IConnection,
) {
  // 1. Arrange – create a fresh member user via join with known credentials.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const correctPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinRequestBody = {
    email,
    password: correctPassword,
    display_name: RandomGenerator.name(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joined: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joined);

  // capture baseline failed_login_count after join
  const baselineFailedCount: number & tags.Type<"int32"> =
    joined.failed_login_count;

  // 2. Act #1 – attempt login with same email but wrong password.
  // Derive an invalid password that is guaranteed to differ from correctPassword
  const wrongPassword: string & tags.Format<"password"> = (correctPassword +
    "_wrong") as string & tags.Format<"password">;

  const invalidLoginBody = {
    email,
    password: wrongPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  await TestValidator.error(
    "login with incorrect password should fail as business error",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: invalidLoginBody,
      });
    },
  );

  // 3. Act #2 – login with correct password should succeed.
  const validLoginBody = {
    email,
    password: correctPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const loggedIn: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: validLoginBody,
    });
  typia.assert(loggedIn);

  // 4. Assert – email should match original email in both responses.
  TestValidator.equals(
    "joined and logged-in email should match original email",
    joined.email,
    email,
  );
  TestValidator.equals(
    "logged-in email should match original email",
    loggedIn.email,
    email,
  );

  // 5. Assert – failed_login_count must have increased after failed attempt.
  TestValidator.predicate(
    "failed_login_count should increase after invalid password attempt",
    loggedIn.failed_login_count > baselineFailedCount,
  );
}
