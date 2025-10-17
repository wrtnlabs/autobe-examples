import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Validate successful member registration flow (todoMember join).
 *
 * Business goals:
 *
 * - Register a new todoMember with a mixed-case email and strong password
 * - Ensure email is normalized to lowercase in the returned identity
 * - Confirm presence of a stable UUID id and issued tokens
 * - Validate timestamps and active-state invariants (deleted_at not set)
 * - Ensure no credential secrets are exposed in the response
 *
 * Steps:
 *
 * 1. Prepare mixed-case email and strong password
 * 2. Call POST /auth/todoMember/join
 * 3. Validate response schema, business rules, and invariants
 */
export async function test_api_todo_member_registration_success(
  connection: api.IConnection,
) {
  // 1) Prepare input
  const inputEmail = "Alice.Member+test@Example.COM";
  const strongPassword = `S${RandomGenerator.alphaNumeric(12)}!9a`;

  // 2) Register member
  const authorized: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connection, {
      body: {
        email: inputEmail,
        password: strongPassword,
      } satisfies ITodoListTodoMemberJoin.ICreate,
    });

  // 3) Schema validation
  typia.assert(authorized);

  // 4) Business rule validations
  // 4-1) Email should be normalized to lowercase
  const expectedEmailLower = inputEmail.toLowerCase();
  TestValidator.equals(
    "email normalized to lowercase",
    authorized.email,
    expectedEmailLower,
  );

  // 4-2) Tokens exist and are non-empty strings (business viability)
  TestValidator.predicate(
    "access token must be non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty",
    authorized.token.refresh.length > 0,
  );

  // 4-3) Timestamp invariants: updated_at >= created_at
  const createdAtMs = new Date(authorized.created_at).getTime();
  const updatedAtMs = new Date(authorized.updated_at).getTime();
  TestValidator.predicate(
    "updated_at must be greater than or equal to created_at",
    updatedAtMs >= createdAtMs,
  );

  // 4-4) Active account: deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at must be null or undefined (active account)",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // 4-5) Ensure no credential secrets are exposed
  const exposesPassword =
    Object.prototype.hasOwnProperty.call(authorized, "password") ||
    Object.prototype.hasOwnProperty.call(authorized, "password_hash") ||
    Object.prototype.hasOwnProperty.call(authorized, "passwordHash");
  TestValidator.predicate(
    "response must not expose credential secrets",
    exposesPassword === false,
  );
}
