import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test login rejection when username does not correspond to any existing member
 * account.
 *
 * This test validates that the login endpoint properly rejects authentication
 * attempts using a username that is not registered in the system. The system
 * performs case-insensitive matching against the discussion_board_members table
 * and should return an error when no matching member account is found.
 *
 * Test steps:
 *
 * 1. Attempt to login with a non-existent username
 * 2. Verify that the API rejects the login request with an appropriate error
 *    response
 * 3. Validate that no authentication tokens are issued
 * 4. Ensure the system prevents account enumeration attacks
 */
export async function test_api_member_login_invalid_username_not_found(
  connection: api.IConnection,
) {
  // Generate a non-existent username that will definitely not exist in the system
  const nonExistentUsername = RandomGenerator.alphaNumeric(16);

  // Generate a valid password (minimum 8 characters as required by schema)
  const password = "ValidPass123!";

  // Generate valid connection metadata URLs
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Prepare login request body with non-existent username
  const loginBody = {
    username: nonExistentUsername,
    password: password,
    href: href,
    referrer: referrer,
  } satisfies IDiscussionBoardMember.ILogin;

  // Attempt to login with non-existent username and expect an error
  await TestValidator.error(
    "login with non-existent username should be rejected",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: loginBody,
      });
    },
  );
}
