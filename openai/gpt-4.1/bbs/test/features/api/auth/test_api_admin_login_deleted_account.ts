import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Tests that soft-deleted administrator accounts (with deleted_at set) cannot
 * log in.
 *
 * This test attempts to log in as an administrator whose account has been
 * soft-deleted (deleted_at not null) and verifies that authentication fails
 * with a generic error, and no token is issued. This is important for business
 * compliance and security: deleted admins must be fully isolated from access.
 *
 * Steps:
 *
 * 1. Prepare login data for an admin account known to be soft-deleted (delete_at
 *    is not null).
 * 2. Attempt to authenticate with valid credentials through the /auth/admin/login
 *    endpoint.
 * 3. Assert that an error occurs and no IDiscussionBoardAdmin.IAuthorized response
 *    is issued.
 */
export async function test_api_admin_login_deleted_account(
  connection: api.IConnection,
) {
  // 1. Prepare valid credentials for a "deleted" admin. These must match an account in the test environment whose deleted_at is set.
  // (Since this is an E2E test, we must use random credentials -- the backend should ensure that no admin record with these credentials will be found unless special test setup is done.)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const loginBody = {
    email,
    password,
    href: "https://test.example.com/admin/login",
    referrer: "https://test.example.com/",
  } satisfies IDiscussionBoardAdmin.ILogin;

  // 2. Attempt login; expect error (API should block deleted accounts)
  await TestValidator.error("soft-deleted admin login must fail", async () => {
    await api.functional.auth.admin.login(connection, { body: loginBody });
  });
}
