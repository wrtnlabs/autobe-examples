import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test display_name field validation following username constraints (3-30
 * characters).
 *
 * Create and authenticate as a member account. Attempt to update display_name
 * with a string shorter than 3 characters. Verify validation error. Attempt
 * with a string longer than 30 characters. Verify validation error. Update with
 * a valid display_name between 3-30 characters. Verify it is accepted and
 * properly saved. Confirm the system enforces the same length constraints as
 * username for consistency.
 */
export async function test_api_member_profile_update_display_name_constraints(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 5 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Attempt to update display_name with too short value (less than 3 characters)
  const tooShortDisplayName = RandomGenerator.alphabets(2);

  await TestValidator.error(
    "display_name shorter than 3 characters should fail",
    async () => {
      await api.functional.discussionBoard.member.members.update(connection, {
        memberId: authenticatedMember.id,
        body: {
          display_name: tooShortDisplayName,
        } satisfies IDiscussionBoardMember.IUpdate,
      });
    },
  );

  // Step 3: Attempt to update display_name with too long value (more than 30 characters)
  const tooLongDisplayName = RandomGenerator.alphabets(31);

  await TestValidator.error(
    "display_name longer than 30 characters should fail",
    async () => {
      await api.functional.discussionBoard.member.members.update(connection, {
        memberId: authenticatedMember.id,
        body: {
          display_name: tooLongDisplayName,
        } satisfies IDiscussionBoardMember.IUpdate,
      });
    },
  );

  // Step 4: Update with valid display_name (3-30 characters)
  const validDisplayName = RandomGenerator.alphaNumeric(15);

  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(connection, {
      memberId: authenticatedMember.id,
      body: {
        display_name: validDisplayName,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updatedMember);

  // Step 5: Verify the display_name was properly saved
  TestValidator.equals(
    "display_name should be updated correctly",
    updatedMember.display_name,
    validDisplayName,
  );
}
