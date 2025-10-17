import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_login_failure_wrong_password(
  connection: api.IConnection,
) {
  /**
   * Test: Admin login failure with wrong password
   *
   * Steps:
   *
   * 1. Create a new admin account via POST /auth/admin/join
   * 2. Attempt to login with the same email but an incorrect password via POST
   *    /auth/admin/login
   * 3. Expect an HTTP client error (400 or 401) and no tokens returned for the
   *    failed login
   *
   * Notes:
   *
   * - Use an unauthenticated copy of the connection for the login attempt to
   *   avoid interference from tokens set by join.
   */

  // 1. Prepare unique admin credentials
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  // 2. Create admin account (prerequisite)
  const created: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        is_super: false,
      } satisfies ITodoAppAdmin.ICreate,
    });
  // Validate response shape and token presence
  typia.assert(created);
  typia.assert(created.token);

  // Business assertion: returned email should match the requested email
  TestValidator.equals(
    "created admin email matches",
    created.email,
    adminEmail,
  );

  // 3. Prepare an unauthenticated copy of connection to attempt login
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt login with incorrect password and expect client error (400 or 401)
  const wrongPassword = adminPassword + "_wrong";
  await TestValidator.httpError(
    "login with wrong password should fail with 400 or 401",
    [400, 401],
    async () => {
      await api.functional.auth.admin.login(unauthConn, {
        body: {
          email: adminEmail,
          password: wrongPassword,
        } satisfies ITodoAppAdmin.ILogin,
      });
    },
  );

  // 5. Post-condition: Ensure unauthenticated connection did not receive tokens
  // (login failed, so SDK should not set authorization header on unauthConn)
  // Note: Avoid inspecting original `connection.headers` per SDK policies. We only inspect unauthConn.
  TestValidator.predicate(
    "unauthenticated connection remains without Authorization after failed login",
    !unauthConn.headers || Object.keys(unauthConn.headers).length === 0,
  );
}
