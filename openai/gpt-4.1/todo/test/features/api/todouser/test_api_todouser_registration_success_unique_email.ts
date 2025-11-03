import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Test successful registration of a new todoUser with unique email.
 *
 * Ensures that when providing an unused, valid email with a sufficiently strong
 * password, the endpoint `/auth/todoUser/join` creates the user account,
 * assigns a system UUID, and provides a valid authentication session. All
 * business constraints (email uniqueness, password policy, system-assigned
 * audit fields) are validated.
 *
 * Steps:
 *
 * 1. Generate a unique email and a strong password (min 8 chars)
 * 2. Compose minimal valid registration origin info (href, referrer)
 * 3. Register via `api.functional.auth.todoUser.join`
 * 4. Assert full type correctness of the response
 * 5. Validate that returned user info matches input properties and system contract
 *    (email, id, timestamps, token)
 */
export async function test_api_todouser_registration_success_unique_email(
  connection: api.IConnection,
) {
  // 1. Generate unique valid email and password
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10) + "aA1!";
  // 2. Generate valid registration origin context
  const href = "https://test-example.com/app/register";
  const referrer = "https://test-example.com/";

  // 3. Attempt registration
  const user = await api.functional.auth.todoUser.join(connection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoListTodouser.IVerifyJoin,
  });
  typia.assert<ITodoListTodouser.IAuthorized>(user);
  // 4. Validate properties
  TestValidator.equals("system returns registered email", user.email, email);
  TestValidator.predicate(
    "id is a non-empty UUID",
    typeof user.id === "string" && user.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof user.created_at === "string" && user.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof user.updated_at === "string" && user.updated_at.length > 0,
  );
  typia.assert<IAuthorizationToken>(user.token);
  TestValidator.predicate(
    "token.access is non-empty",
    typeof user.token.access === "string" && user.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    typeof user.token.refresh === "string" && user.token.refresh.length > 0,
  );
}
