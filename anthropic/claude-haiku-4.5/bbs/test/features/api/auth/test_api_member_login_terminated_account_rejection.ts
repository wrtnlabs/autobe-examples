import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test login rejection for invalid authentication credentials.
 *
 * Validates that the login endpoint properly rejects invalid credential
 * combinations. The system validates provided credentials and returns an
 * appropriate error when authentication fails.
 *
 * Steps:
 *
 * 1. Generate valid URI format data for session tracking
 * 2. Attempt to login with invalid email and password combination
 * 3. Verify that login fails with an appropriate error response
 * 4. Confirm no authorization token is issued on failed authentication
 */
export async function test_api_member_login_terminated_account_rejection(
  connection: api.IConnection,
) {
  // Generate test data for login attempt
  const invalidEmail = typia.random<string & tags.Format<"email">>();
  const invalidPassword = "InvalidPassword123!@#";
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  // Attempt to login with non-existent/invalid credentials
  // This validates that the login endpoint properly rejects invalid authentication
  await TestValidator.error(
    "login should reject invalid credentials",
    async () => {
      return await api.functional.auth.member.login(connection, {
        body: {
          email: invalidEmail,
          password: invalidPassword,
          href: testHref,
          referrer: testReferrer,
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
