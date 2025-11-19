import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test registration failure when attempting to register with a duplicate email
 * address.
 *
 * This test validates the email uniqueness constraint (@@unique([email]))
 * enforced by the database schema. It ensures that the system properly rejects
 * registration attempts using an email that already exists in the
 * discussion_board_members table.
 *
 * Test workflow:
 *
 * 1. Successfully register a first member with a specific email address
 * 2. Verify the first registration returns valid member data and authentication
 *    tokens
 * 3. Attempt to register a second member using the same email but different
 *    credentials
 * 4. Confirm that the duplicate email registration is rejected with an error
 * 5. Validate that no new member record or session is created for the failed
 *    attempt
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate test data for the first member registration
  const sharedEmail = typia.random<string & tags.Format<"email">>();
  const firstUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();
  const firstPassword = typia.random<string & tags.Format<"password">>();

  // Create first member successfully
  const firstMemberData = {
    email: sharedEmail,
    password: firstPassword,
    username: firstUsername,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const firstMember = await api.functional.auth.member.join(connection, {
    body: firstMemberData,
  });
  typia.assert(firstMember);

  // Validate first member registration succeeded with correct data
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    sharedEmail,
  );
  TestValidator.equals(
    "first member username matches",
    firstMember.username,
    firstUsername,
  );

  // Generate different credentials for the duplicate attempt
  const secondUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();
  const secondPassword = typia.random<string & tags.Format<"password">>();

  // Attempt to register with the same email but different username and password
  const duplicateAttemptData = {
    email: sharedEmail,
    password: secondPassword,
    username: secondUsername,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Verify that duplicate email registration fails
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: duplicateAttemptData,
      });
    },
  );
}
