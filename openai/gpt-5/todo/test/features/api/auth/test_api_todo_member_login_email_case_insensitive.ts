import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberLogin";

/**
 * Verify that member login treats email case-insensitively and normalizes to
 * lowercase.
 *
 * Steps
 *
 * 1. Register a member via POST /auth/todoMember/join with a mixed-case email like
 *    "Case.<random>+alias@Example.COM" and a valid password (>= 8 chars).
 * 2. Log in via POST /auth/todoMember/login with the same email lowercased and the
 *    same password.
 * 3. Expect success with the same member id as registration and email normalized
 *    to lowercase in the response; also ensure tokens are present (non-empty
 *    strings).
 *
 * Notes
 *
 * - Uses only ITodoListTodoMemberJoin.ICreate and
 *   ITodoListTodoMemberLogin.ICreate for request bodies.
 * - Validates responses using typia.assert() against
 *   ITodoListTodoMember.IAuthorized.
 * - Does not touch connection.headers; SDK manages tokens automatically.
 */
export async function test_api_todo_member_login_email_case_insensitive(
  connection: api.IConnection,
) {
  // Prepare unique mixed-case email and a valid password (>= 8 chars)
  const unique = RandomGenerator.alphaNumeric(10);
  const mixedEmail = `Case.${unique}+alias@Example.COM`;
  const lowerEmail = mixedEmail.toLowerCase();
  const password = `P@ssw0rd-${RandomGenerator.alphaNumeric(10)}`; // length > 8

  // 1) Register with mixed-case email
  const joined = await api.functional.auth.todoMember.join(connection, {
    body: {
      email: typia.assert<string & tags.Format<"email">>(mixedEmail),
      password,
    } satisfies ITodoListTodoMemberJoin.ICreate,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(joined);

  // 2) Login with same email lowercased
  const logged = await api.functional.auth.todoMember.login(connection, {
    body: {
      email: typia.assert<string & tags.Format<"email">>(lowerEmail),
      password,
    } satisfies ITodoListTodoMemberLogin.ICreate,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(logged);

  // 3) Business assertions
  TestValidator.equals(
    "login returns the same member id as registration",
    logged.id,
    joined.id,
  );
  TestValidator.equals(
    "email is normalized to lowercase in login response",
    logged.email,
    lowerEmail,
  );
  TestValidator.predicate(
    "access token should be a non-empty string",
    logged.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    logged.token.refresh.length > 0,
  );
}
