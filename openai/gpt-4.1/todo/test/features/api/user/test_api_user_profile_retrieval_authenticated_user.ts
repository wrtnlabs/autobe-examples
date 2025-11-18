import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that an authenticated user can retrieve their detailed user profile by
 * email.
 *
 * 1. Register a new user using unique, valid registration data.
 * 2. Login with newly created credentials to establish authentication context.
 * 3. Use authenticated session to call GET /todoList/user/users/{email} for the
 *    profile.
 * 4. Validate that returned profile matches registration (id, email, timestamps).
 * 5. Repeat the profile retrieval without authentication, expect an authorization
 *    error.
 */
export async function test_api_user_profile_retrieval_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password: password as string &
      tags.MinLength<8> &
      tags.MaxLength<100> &
      tags.Format<"password">,
    href: "https://www.testing-join.com/register",
    referrer: "https://www.testing-join.com/login",
    ip: null,
  } satisfies ITodoListUser.ICreate;
  const joined = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // 2. Login to obtain authenticated context
  const loginBody = {
    email,
    password: password as string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">,
    href: "https://www.testing-login.com/home",
    referrer: "https://www.testing-join.com/register",
    ip: undefined,
  } satisfies ITodoListUser.ILogin;
  const authorized = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(authorized);

  // 3. Authenticated user retrieves their profile by email
  const retrieved = await api.functional.todoList.user.users.at(connection, {
    email,
  });
  typia.assert(retrieved);

  // 4. Validate returned profile matches registration
  TestValidator.equals(
    "user profile id matches registered id",
    retrieved.id,
    joined.id,
  );
  TestValidator.equals(
    "user profile email matches registered email",
    retrieved.email,
    email,
  );

  // 5. Attempt profile retrieval while unauthenticated - must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated profile lookup must fail",
    async () => {
      await api.functional.todoList.user.users.at(unauthConn, { email });
    },
  );
}
