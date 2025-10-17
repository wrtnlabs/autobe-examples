import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberLogin";

export async function test_api_todo_member_login_success_existing_member(
  connection: api.IConnection,
) {
  /**
   * Validate successful login for an existing member created earlier in the
   * flow.
   *
   * Steps:
   *
   * 1. Join a new member with a unique email derived from
   *    "login.success@example.com"
   * 2. Login using the same credentials
   * 3. Verify identity consistency (id match), email normalization, token issuance
   * 4. Ensure no secret fields are exposed and timestamps are consistent
   */
  // 1) Register (join) a new member with a unique email to avoid uniqueness conflicts
  const emailBase = "login.success@example.com";
  const uniqueTag = RandomGenerator.alphaNumeric(8);
  const email = `login.success+${uniqueTag}@example.com`;
  const password = "Str0ng!Passw0rd#1";

  const joinBody = {
    email,
    password,
  } satisfies ITodoListTodoMemberJoin.ICreate;

  const joined = await api.functional.auth.todoMember.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // Validate email normalization and token existence on join response
  TestValidator.equals(
    "email is normalized to lowercase on join",
    joined.email,
    email.toLowerCase(),
  );
  TestValidator.predicate(
    "join token.access is non-empty",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "join token.refresh is non-empty",
    joined.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "join response does not expose password_hash",
    "password_hash" in (joined as object) === false,
  );

  // 2) Login with the same credentials
  const loginBody = {
    email,
    password,
  } satisfies ITodoListTodoMemberLogin.ICreate;

  const loggedIn = await api.functional.auth.todoMember.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  // 3) Identity and email normalization checks
  TestValidator.equals(
    "login id equals join id (same identity)",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "email is normalized to lowercase on login",
    loggedIn.email,
    email.toLowerCase(),
  );

  // 4) Token checks and timestamp consistency
  TestValidator.predicate(
    "login token.access is non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh is non-empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.equals(
    "created_at remains unchanged between join and login",
    loggedIn.created_at,
    joined.created_at,
  );

  const createdAtMs = Date.parse(joined.created_at);
  const updatedAtMs = Date.parse(loggedIn.updated_at);
  TestValidator.predicate(
    "updated_at on login is not earlier than created_at",
    updatedAtMs >= createdAtMs,
  );
}
