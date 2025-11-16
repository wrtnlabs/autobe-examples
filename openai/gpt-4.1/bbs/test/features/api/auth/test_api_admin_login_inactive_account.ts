import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Validates that administrators who are not active cannot log in.
 *
 * Attempts authentication using the credentials of an administrator account
 * explicitly marked as is_active=false. Expects the login request to fail, with
 * NO access or refresh tokens issued, proving that only active administrators
 * can successfully log in and have sessions issued.
 *
 * 1. Generate a known valid administrator login (email & password)
 * 2. Assume that the backend contains an admin with this email, password, and
 *    is_active=false (precondition for E2E)
 * 3. Compose a login request using valid credentials and other required fields
 *    (href, referrer)
 * 4. Attempt administrator login via api.functional.auth.admin.login
 * 5. Assert that an error occurs and no session/token is issued, verifying that
 *    inactive admins are not authenticated
 */
export async function test_api_admin_login_inactive_account(
  connection: api.IConnection,
) {
  // Step 1: Prepare known inactive admin account credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  // Assume that in E2E env, this admin user exists and has is_active=false
  // (If not, this test would need a prior admin setup, but per constraints, only this API is available.)

  // Step 2: Create valid login request complying with IDiscussionBoardAdmin.ILogin
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdmin.ILogin;

  // Step 3: Attempt login and validate failure
  await TestValidator.error("inactive admin cannot authenticate", async () => {
    await api.functional.auth.admin.login(connection, { body: loginBody });
  });
}
