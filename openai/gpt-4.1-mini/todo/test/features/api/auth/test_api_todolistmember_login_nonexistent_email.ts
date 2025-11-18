import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";

/**
 * Attempt to log in with a non-existent email address and validate that the API
 * rejects the attempt.
 *
 * 1. Prepare login credentials using a unique, never-registered email address.
 * 2. Attempt login using the /auth/todoListMember/login endpoint.
 * 3. Expect an error indicating account not found, no tokens issued.
 * 4. Assert the response error format is appropriate and secure.
 */
export async function test_api_todolistmember_login_nonexistent_email(
  connection: api.IConnection,
) {
  const fakeEmail = typia.random<string & tags.Format<"email">>();
  const credentials = {
    email: fakeEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ITodoListTodolistmember.ILogin;

  await TestValidator.error(
    "login with nonexistent email should fail and not return tokens",
    async () => {
      await api.functional.auth.todoListMember.login(connection, {
        body: credentials,
      });
    },
  );
}
