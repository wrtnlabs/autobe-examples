import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test login rejection when email address does not exist in system.
 *
 * This test validates that the contributor login endpoint properly rejects
 * authentication attempts with non-existent email addresses. The test attempts
 * to login with an email 'nonexistent@example.com' that was never registered in
 * the system.
 *
 * Expected behavior:
 *
 * - Login request should fail with an error response
 * - System should not expose that the account doesn't exist (security measure to
 *   prevent account enumeration)
 * - No authentication token should be issued
 * - No session should be created for the failed login attempt
 *
 * Test steps:
 *
 * 1. Prepare login credentials with non-existent email address
 * 2. Attempt to login via contributor login API
 * 3. Verify the request fails with appropriate error
 * 4. Confirm no session was created
 */
export async function test_api_contributor_login_account_not_found(
  connection: api.IConnection,
) {
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.contributor.login(connection, {
        body: {
          email: nonexistentEmail,
          password: password,
          href: href,
          referrer: referrer,
        } satisfies IDiscussionBoardContributor.ILogin,
      });
    },
  );
}
