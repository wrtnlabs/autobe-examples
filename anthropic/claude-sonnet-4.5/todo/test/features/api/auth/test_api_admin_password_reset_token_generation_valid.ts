import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates admin password reset token generation for an enabled admin account.
 *
 * 1. Register a new admin account (with unique email and proper context) via POST
 *    /auth/admin/join
 * 2. Request a password reset token for this email via POST
 *    /auth/admin/password/reset-token
 * 3. Assert that a valid ITodoListAdmin.IPasswordResetToken result is returned.
 * 4. Check properties: id (uuid), token (non-empty string), created_at
 *    (date-time), expires_at (date-time), used_at null/undefined,
 *    todo_list_user_id undefined, and that fields are auditable
 * 5. Assert only one active token exists by issuing a second reset-token request
 *    and verifying a new token is created (id/token/created_at/expires_at
 *    change, prior token is no longer current)
 * 6. (Anti-enumeration is asserted only on positive flows here.)
 */
export async function test_api_admin_password_reset_token_generation_valid(
  connection: api.IConnection,
) {
  // 1. Register admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const joinBody = {
    email,
    password,
    href: "https://admin.console.todolist-app.io/register",
    referrer: "https://todolist-app.io/landing",
    ip: undefined,
  } satisfies ITodoListAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, email);

  // 2. Request password reset token
  const resetReq = {
    email,
  } satisfies ITodoListAdmin.IFindForPasswordReset;
  const resetToken1 =
    await api.functional.auth.admin.password.reset_token.generatePasswordResetToken(
      connection,
      { body: resetReq },
    );
  typia.assert(resetToken1);
  // Assert schema: id (uuid), token (string), created_at/date-time, expires_at/date-time, used_at undefined/null
  TestValidator.predicate(
    "token id is uuid",
    typeof resetToken1.id === "string" &&
      /^[0-9a-f-]{36}$/.test(resetToken1.id),
  );
  TestValidator.predicate(
    "token value is non-empty",
    typeof resetToken1.token === "string" && resetToken1.token.length > 0,
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof resetToken1.created_at === "string" &&
      resetToken1.created_at.length > 0,
  );
  TestValidator.predicate(
    "expires_at is date-time",
    typeof resetToken1.expires_at === "string" &&
      resetToken1.expires_at.length > 0,
  );
  TestValidator.equals(
    "used_at is not yet used (should be null/undefined)",
    resetToken1.used_at,
    null,
  );
  TestValidator.equals(
    "todo_list_user_id should be undefined",
    resetToken1.todo_list_user_id,
    undefined,
  );

  // 3. Only one valid token at a time: create another token and expect distinct output
  const resetToken2 =
    await api.functional.auth.admin.password.reset_token.generatePasswordResetToken(
      connection,
      { body: resetReq },
    );
  typia.assert(resetToken2);
  TestValidator.notEquals(
    "second token id should differ",
    resetToken2.id,
    resetToken1.id,
  );
  TestValidator.notEquals(
    "second token value should differ",
    resetToken2.token,
    resetToken1.token,
  );
  TestValidator.notEquals(
    "second token created_at should differ",
    resetToken2.created_at,
    resetToken1.created_at,
  );
  TestValidator.notEquals(
    "second token expires_at should differ",
    resetToken2.expires_at,
    resetToken1.expires_at,
  );
  TestValidator.equals(
    "used_at is still not yet used (null/undefined)",
    resetToken2.used_at,
    null,
  );
  TestValidator.equals(
    "todo_list_user_id still undefined",
    resetToken2.todo_list_user_id,
    undefined,
  );
}
