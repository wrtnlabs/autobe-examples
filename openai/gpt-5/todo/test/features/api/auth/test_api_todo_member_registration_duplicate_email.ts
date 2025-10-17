import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Duplicate email registration must be rejected while first join succeeds.
 *
 * Business purpose
 *
 * - Ensure that member registration (/auth/todoMember/join) enforces unique email
 *   policy with case-insensitive normalization, and never leaks sensitive
 *   details beyond a neutral failure.
 *
 * Steps
 *
 * 1. Prepare a random valid email and strong password.
 * 2. Call POST /auth/todoMember/join with that email and password: expect success
 *    and authorized payload with tokens. Verify email normalization to
 *    lowercase.
 * 3. Immediately call join again with the SAME email but different casing and a
 *    new password: expect an error thrown (business logic violation: duplicate
 *    email).
 *
 * Notes
 *
 * - Do not test specific HTTP status codes or error messages; only assert that an
 *   error occurs.
 * - Do not manipulate connection.headers; the SDK manages auth headers
 *   internally.
 */
export async function test_api_todo_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // 1) Prepare registration inputs
  const rawEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password1: string = RandomGenerator.alphaNumeric(16);

  const firstJoinBody = {
    email: rawEmail,
    password: password1,
  } satisfies ITodoListTodoMemberJoin.ICreate;

  // 2) First join should succeed
  const firstJoin: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connection, {
      body: firstJoinBody,
    });
  typia.assert(firstJoin);

  // Email should be normalized to lowercase according to policy
  TestValidator.equals(
    "registered email is normalized to lowercase",
    firstJoin.email,
    rawEmail.toLowerCase(),
  );

  // 3) Second join attempt with different casing must be rejected
  const emailVariant = rawEmail.toUpperCase();
  const password2: string = RandomGenerator.alphaNumeric(18);
  const secondJoinBody = {
    email: emailVariant,
    password: password2,
  } satisfies ITodoListTodoMemberJoin.ICreate;

  await TestValidator.error(
    "duplicate email registration is rejected (case-insensitive)",
    async () => {
      await api.functional.auth.todoMember.join(connection, {
        body: secondJoinBody,
      });
    },
  );
}
