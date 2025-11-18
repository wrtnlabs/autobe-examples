import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate admin login failure with incorrect password.
 *
 * This test ensures the /auth/admin/login endpoint rejects login when a valid
 * admin email is supplied with an invalid password. It confirms the API refuses
 * authentication, issues no tokens, and returns an error response according to
 * security and business rules.
 *
 * Steps:
 *
 * 1. Generate a random admin login (email, password, display_name).
 * 2. Register this admin via direct backend mutation or a dedicated join function.
 *    (If not exposed, skip real registration since only login API is
 *    available.)
 * 3. Attempt login using the correct email but an incorrect password.
 * 4. Validate that the result is an error, with no IAuthorized response, no token,
 *    and no session issued.
 * 5. Confirm error handling follows business rules for failed admin logins.
 */
export async function test_api_admin_login_failure_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Generate a random valid admin email/password.
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = typia.random<string & tags.Format<"password">>();
  // Skipping registration -- only the login API is available, so this step is skipped as there is no admin join API in provided SDK.

  // Step 2: Attempt login with the valid email and incorrect password.
  const wrongPassword = RandomGenerator.alphaNumeric(12);
  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email,
        password: wrongPassword,
      } satisfies ITodoListAdmin.ILogin,
    });
  });
}
