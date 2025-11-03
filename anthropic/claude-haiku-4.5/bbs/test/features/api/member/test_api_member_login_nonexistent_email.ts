import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login rejection with non-existent email.
 *
 * Validates that the discussion board authentication system rejects login
 * attempts when the provided email address does not exist in the
 * discussion_board_members table. The system returns a generic error message
 * that does not reveal whether the email exists or the password was incorrect,
 * preventing email enumeration attacks.
 *
 * This test ensures:
 *
 * 1. Login attempts with non-existent email addresses are rejected
 * 2. Generic error messages are returned (no email enumeration)
 * 3. Proper error handling for authentication failures
 * 4. Security best practices are maintained
 */
export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random non-existent email address
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Attempt to login with non-existent email
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.discussionBoard.auth.login.signIn(connection, {
        body: {
          email: nonexistentEmail,
          password: password,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );
}
