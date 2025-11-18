import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";

/**
 * Validate successful new todoListMember account registration.
 *
 * This test covers the happy path of registering a new user (todoListMember)
 * with a unique, valid email, a password meeting minimum security policy, and
 * all required session context fields.
 *
 * Steps:
 *
 * 1. Prepare registration data with a unique email, valid password, random href,
 *    and referrer URIs.
 * 2. Call the /auth/todoListMember/join API with prepared registration body.
 * 3. Validate that response contains IAuthorized data, including id, email,
 *    created_at, and JWT token bundle (access, refresh, expiration info).
 * 4. Use typia.assert() to verify all returned types, and TestValidator to check
 *    all expected fields are populated appropriately.
 */
export async function test_api_todolistmember_account_registration_success(
  connection: api.IConnection,
) {
  // 1. Prepare unique registration data
  const email: string &
    tags.MinLength<1> &
    tags.MaxLength<255> &
    tags.Format<"email"> = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> & tags.MaxLength<128> =
    typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>();
  const href: string & tags.MinLength<1> & tags.Format<"uri"> = typia.random<
    string & tags.MinLength<1> & tags.Format<"uri">
  >();
  const referrer: string & tags.MinLength<1> & tags.Format<"uri"> =
    typia.random<string & tags.MinLength<1> & tags.Format<"uri">>();
  const ip: (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">) =
    RandomGenerator.pick([
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
    ]);

  const requestBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoListTodolistmember.ICreate;

  // 2. Register account
  const result: ITodoListTodolistmember.IAuthorized =
    await api.functional.auth.todoListMember.join(connection, {
      body: requestBody,
    });
  typia.assert(result);

  // 3. Validate returned dto structure
  TestValidator.predicate(
    "authorized object has id",
    typeof result.id === "string" && result.id.length > 0,
  );
  TestValidator.predicate("email equals input email", result.email === email);
  TestValidator.predicate(
    "created_at is present",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  typia.assert<IAuthorizationToken>(result.token);
  TestValidator.predicate(
    "access token present",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at present",
    typeof result.token.expired_at === "string" &&
      result.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until present",
    typeof result.token.refreshable_until === "string" &&
      result.token.refreshable_until.length > 0,
  );
}
