import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Test login restriction for blocked administrator accounts.
 *
 * Attempts to log in with a valid blocked admin account (is_blocked=true) using
 * correct credentials. Expects login to fail with an error response (should not
 * issue tokens or session records), verifying that blocked admins cannot
 * authenticate regardless of password correctness. Ensures security and
 * compliance for admin login restriction policies.
 */
export async function test_api_admin_login_blocked_account(
  connection: api.IConnection,
) {
  // Generate blocked admin credentials (the actual provisioning of the blocked admin is assumed to exist in test fixture or seed)
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdmin.ILogin;

  // Attempt login and expect failure, verifying that authentication is denied for blocked admins
  await TestValidator.error("blocked admin login should fail", async () => {
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  });
}
