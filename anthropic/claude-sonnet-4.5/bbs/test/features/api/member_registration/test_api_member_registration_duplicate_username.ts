import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test registration failure when attempting to register with a username that
 * already exists in the system.
 *
 * **Test Flow:**
 *
 * 1. First, successfully register a member with a specific username, email, and
 *    password
 * 2. Verify the first registration succeeds and returns authorized member data
 *    with JWT tokens
 * 3. Then, attempt to register a second member using a DIFFERENT email but the
 *    SAME username
 * 4. Verify that the second registration attempt fails with an error due to
 *    username uniqueness constraint
 * 5. Confirm that no new member record is created and no JWT tokens are issued for
 *    the duplicate attempt
 *
 * This test validates the @@unique([username]) constraint enforcement in the
 * discussion_board_members table.
 */
export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Step 1: Generate unique test data for the first member
  const sharedUsername = RandomGenerator.name(1); // Single word username
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = typia.random<string & tags.Format<"password">>();

  const firstMemberData = {
    email: firstEmail,
    password: firstPassword,
    username: sharedUsername,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 2: Successfully register the first member
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: firstMemberData,
    });

  typia.assert(firstMember);

  // Step 3: Validate first member registration succeeded
  TestValidator.equals(
    "first member username matches",
    firstMember.username,
    sharedUsername,
  );
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    firstEmail,
  );
  TestValidator.predicate(
    "first member has access token",
    !!firstMember.token.access,
  );
  TestValidator.predicate(
    "first member has refresh token",
    !!firstMember.token.refresh,
  );

  // Step 4: Attempt to register a second member with different email but SAME username
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondPassword = typia.random<string & tags.Format<"password">>();

  const secondMemberData = {
    email: secondEmail,
    password: secondPassword,
    username: sharedUsername, // SAME username as first member
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 5: Verify that the duplicate username registration fails
  await TestValidator.error(
    "duplicate username registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: secondMemberData,
      });
    },
  );
}
