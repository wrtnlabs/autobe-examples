import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test username uniqueness validation during member profile update.
 *
 * This test validates that the discussion board platform properly enforces
 * username uniqueness constraints when members attempt to update their profile
 * information. The system must prevent members from changing their username to
 * one that is already in use by another member.
 *
 * Test workflow:
 *
 * 1. Create first member account with unique username
 * 2. Create second member account with different unique username
 *    (auto-authenticates)
 * 3. Attempt to update second member's username to match first member's username
 * 4. Verify that the update operation fails with appropriate error
 *
 * This ensures data integrity and prevents username conflicts across the
 * platform.
 */
export async function test_api_member_profile_update_username_uniqueness(
  connection: api.IConnection,
) {
  // Create first member account
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberUsername = RandomGenerator.name();
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        password: "password123",
        username: firstMemberUsername,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(firstMember);

  // Create second member account with different username
  // This automatically authenticates as the second member
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberUsername = RandomGenerator.name();
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        password: "password456",
        username: secondMemberUsername,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // Verify both members have different usernames
  TestValidator.notEquals(
    "first and second member usernames should differ",
    firstMember.username,
    secondMember.username,
  );

  // Attempt to update second member's username to match first member's username
  // This should fail due to username uniqueness constraint
  // Connection is already authenticated as second member after the join call
  await TestValidator.error(
    "updating username to existing username should fail",
    async () => {
      await api.functional.discussionBoard.member.members.update(connection, {
        memberId: secondMember.id,
        body: {
          username: firstMember.username,
        } satisfies IDiscussionBoardMember.IUpdate,
      });
    },
  );
}
