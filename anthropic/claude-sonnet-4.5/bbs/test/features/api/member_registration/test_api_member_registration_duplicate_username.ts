import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration failure when attempting to register with a username
 * that already exists.
 *
 * This test validates the username uniqueness constraint in the
 * discussion_board_members table. First, it successfully registers a member
 * with a specific username. Then, it attempts to register another member using
 * the same username but with different email and password. The system should
 * reject the second registration attempt and return an appropriate error
 * indicating that the username is already taken.
 *
 * Test Flow:
 *
 * 1. Register first member with random username, email, and password
 * 2. Verify successful registration and token issuance
 * 3. Attempt to register second member with same username but different email
 * 4. Verify that registration fails with appropriate error
 */
export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Step 1: Generate test data for first member registration
  const firstUsername = RandomGenerator.name(1);
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = "password123";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Successfully register the first member
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstEmail,
      password: firstPassword,
      username: firstUsername,
      href: href,
      referrer: referrer,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 3: Verify first member registration succeeded
  TestValidator.equals(
    "first member username matches",
    firstMember.username,
    firstUsername,
  );
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    firstEmail,
  );

  // Step 4: Generate different credentials for second registration attempt (same username)
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondPassword = "differentPassword456";

  // Step 5: Attempt to register second member with duplicate username
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: secondEmail,
          password: secondPassword,
          username: firstUsername, // SAME username as first member
          href: href,
          referrer: referrer,
        } satisfies IDiscussionBoardMember.ICreate,
      });
    },
  );
}
