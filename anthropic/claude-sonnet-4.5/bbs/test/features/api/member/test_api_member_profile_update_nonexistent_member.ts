import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test error handling when attempting to update a profile for a nonexistent
 * member ID.
 *
 * This test validates that the system properly handles attempts to update
 * member profiles using nonexistent member IDs. It ensures the API validates
 * member existence before processing update requests and returns appropriate
 * error responses.
 *
 * Steps:
 *
 * 1. Create and authenticate a new member account
 * 2. Generate a valid UUID that does not correspond to any existing member
 * 3. Attempt to update the profile using the nonexistent memberId
 * 4. Verify the operation fails with an appropriate error
 */
export async function test_api_member_profile_update_nonexistent_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Generate a nonexistent member ID (valid UUID format but doesn't exist)
  const nonexistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to update profile with nonexistent member ID
  const updateData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardMember.IUpdate;

  // Step 4: Verify the operation fails with an error
  await TestValidator.error(
    "updating nonexistent member should fail",
    async () => {
      await api.functional.discussionBoard.member.members.update(connection, {
        memberId: nonexistentMemberId,
        body: updateData,
      });
    },
  );
}
