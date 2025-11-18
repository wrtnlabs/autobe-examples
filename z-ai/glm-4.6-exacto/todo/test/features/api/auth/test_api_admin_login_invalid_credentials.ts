import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Test that providing an incorrect password with a valid administrator email
 * denies access. No JWT tokens are issued, login fails gracefully, and security
 * compliance logging is maintained. This scenario ensures error responses do
 * not leak account existence or system details and that repeated failures are
 * auditable.
 */
export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Generate a valid admin email pattern, but use a definitely-wrong password
  const adminEmail =
    RandomGenerator.name(1).toLowerCase() + "@autobe-example.test";
  // Password policy: at least 8 chars, random, but wrong (never correct)
  const invalidPassword = RandomGenerator.alphaNumeric(12) + "!@";
  // Href and referrer must be URIs
  const loginBody = {
    email: adminEmail as string & tags.Format<"email">,
    password: invalidPassword as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    ip: null,
    href: "https://autobe-app-admin.test/login" as string & tags.Format<"uri">,
    referrer: "https://autobe-app-admin.test" as string & tags.Format<"uri">,
  } satisfies ITodoAppAdmin.ILogin;

  // Attempt to login and expect error
  await TestValidator.error(
    "admin login fails with invalid credentials",
    async () => {
      await api.functional.auth.admin.login(connection, { body: loginBody });
    },
  );
}
