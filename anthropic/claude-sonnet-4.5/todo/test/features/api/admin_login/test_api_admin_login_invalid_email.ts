import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin login failure with non-existent email address.
 *
 * This test validates that the admin authentication endpoint properly rejects
 * login attempts using email addresses that do not exist in the
 * todo_list_admins table. The test ensures secure error handling that prevents
 * user enumeration attacks by not revealing whether an email exists in the
 * system.
 *
 * Test Steps:
 *
 * 1. Generate a random email address that does not exist in the database
 * 2. Attempt to authenticate with the non-existent email and any password
 * 3. Provide valid connection context (IP, URL, referrer) as required
 * 4. Verify that the login attempt fails with an authentication error
 * 5. Confirm no session is created and no tokens are issued
 */
export async function test_api_admin_login_invalid_email(
  connection: api.IConnection,
) {
  // Generate a non-existent email address for testing
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Attempt login with non-existent email - this should fail
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "anyPassword123!",
          ip: "192.168.1.100",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ILogin,
      });
    },
  );
}
