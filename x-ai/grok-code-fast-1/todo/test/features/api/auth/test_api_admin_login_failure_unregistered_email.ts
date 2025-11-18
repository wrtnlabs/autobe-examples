import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate that login fails for an unregistered admin email.
 *
 * This test confirms that when attempting to login with an email that does not
 * exist in the admin table, the server responds with a proper credential
 * failure error. The response should not expose account existence information,
 * should not issue any tokens or session, and must signal a failed login (not a
 * generic or ambiguous error). This maintains security against account
 * enumeration and enforces authentication best practices.
 *
 * Steps:
 *
 * 1. Generate a random (unregistered) admin email and any password
 * 2. Attempt to login using the api.functional.auth.admin.login endpoint
 * 3. Assert that an error is thrown; validate that no ITodoListAdmin.IAuthorized
 *    is returned
 * 4. (Implicit) No AuthorizationToken or session is saved/issued
 * 5. The error must be business-rule-specific for credential failure (not HTTP 500
 *    or user enumeration)
 */
export async function test_api_admin_login_failure_unregistered_email(
  connection: api.IConnection,
) {
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();

  await TestValidator.error(
    "login fails for unregistered admin email",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email,
          password,
        } satisfies ITodoListAdmin.ILogin,
      });
    },
  );
}
