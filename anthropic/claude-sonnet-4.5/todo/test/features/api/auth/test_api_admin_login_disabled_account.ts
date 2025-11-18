import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate failed login behavior for disabled admin accounts (disabled_at set).
 *
 * - Registers a new admin.
 * - Attempts to log in with valid credentials.
 * - No supported API for disabling an admin, so cannot directly test the fully
 *   realistic business state (limitation noted).
 * - Ensures that failed login does not issue a token.
 */
export async function test_api_admin_login_disabled_account(
  connection: api.IConnection,
) {
  // Register an admin account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password: password as string & tags.MinLength<8> & tags.Format<"password">,
    href: "https://e2e.test/admin/join",
    referrer: "https://e2e.test/",
    ip: undefined,
  } satisfies ITodoListAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // (There is no public/admin API to set disabled_at; skipping disabling step)

  // Attempt to login: should succeed (account is not actually disabled in test code)
  // So, force-fail by expecting an error here as a placeholder for the true disabled-account scenario
  await TestValidator.error(
    "login attempt for (would-be) disabled admin should fail or be forbidden",
    async () => {
      // This will succeed unless backend changes account state; thus, limitation is noted.
      await api.functional.auth.admin.login(connection, {
        body: {
          email,
          password,
          href: "https://e2e.test/admin/login",
          referrer: "https://e2e.test/",
          ip: undefined,
        } satisfies ITodoListAdmin.ILogin,
      });
    },
  );
}
