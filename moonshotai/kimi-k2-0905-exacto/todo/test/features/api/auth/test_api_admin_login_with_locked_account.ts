import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate admin login failure when the account is locked.
 *
 * This test ensures that attempting to authenticate as an admin with a locked
 * account (is_locked = true) is denied by the backend. The API should NOT issue
 * any tokens or create a session for a locked account.
 *
 * - It crafts an ITodoListAdmin.ILogin with a test email and password intending
 *   to target a locked admin account.
 * - It sends a POST /auth/admin/login request with these credentials (the account
 *   must be locked in the test DB).
 * - It expects authentication to fail with a business error (not a type error),
 *   meaning TestValidator.error() must be used.
 * - It must NOT attempt or expect the IAuthorized structure in response.
 * - It may repeat the login attempt to ensure lock state is enforced
 *   consistently.
 *
 * Note: Since account fixture creation is not exposed by API in these
 * materials, this test solely assumes existence of at least one locked admin
 * (test database seed or prior fixture step).
 */
export async function test_api_admin_login_with_locked_account(
  connection: api.IConnection,
) {
  // Prepare locked admin credentials
  const lockedEmail: string & tags.Format<"email"> = "locked_admin@example.com";
  const password: string & tags.Format<"password"> = "lockedPassword!123";

  const body = {
    email: lockedEmail,
    password,
    // Use fixed href/referrer for determinism in E2E
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/",
  } satisfies ITodoListAdmin.ILogin;

  // Attempt login: must error because account is locked
  await TestValidator.error(
    "login should fail for locked admin account",
    async () => {
      await api.functional.auth.admin.login(connection, { body });
    },
  );

  // Sanity: repeat attempt (must always fail)
  await TestValidator.error(
    "repeat login attempt for locked admin is also denied",
    async () => {
      await api.functional.auth.admin.login(connection, { body });
    },
  );
}
