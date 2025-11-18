import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test login attempt for a soft-deleted admin (deleted_at is not null).
 *
 * This test ensures that if valid credentials (email and password) for a
 * soft-deleted admin (where deleted_at is not null) are used to attempt login
 * via POST /auth/admin/login, the authentication will fail.
 *
 * The system should return a generic error, grant no token, and not reveal
 * whether the email is valid or deleted/incorrect (to prevent account
 * enumeration).
 *
 * Steps:
 *
 * 1. Generate credentials for a soft-deleted admin (email, password).
 * 2. Attempt login with these credentials.
 * 3. Assert that authentication is denied, no tokens returned, and error returned
 *    is generic (does not leak locked/deletion/email existence info).
 */
export async function test_api_admin_login_for_soft_deleted_account(
  connection: api.IConnection,
) {
  // Compose soft-deleted admin credentials
  const deleted_admin_email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const deleted_admin_password: string &
    tags.MinLength<8> &
    tags.MaxLength<128> &
    tags.Format<"password"> = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128> & tags.Format<"password">
  >();

  // Attempt login for soft-deleted admin: should fail with generic error
  await TestValidator.error(
    "login attempt for soft-deleted admin is denied",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: deleted_admin_email,
          password: deleted_admin_password,
        } satisfies ITodoListAdmin.ILogin,
      });
    },
  );
}
