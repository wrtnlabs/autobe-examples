import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserReputation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserReputation";

/**
 * Test retrieving reputation information for a new user with zero voting
 * history.
 *
 * This test validates the reputation system's zero-state functionality by
 * creating a new member account and immediately checking their reputation
 * information. New users should have all reputation metrics initialized to
 * zero, representing the "New Contributor" tier (0-99 points).
 *
 * Test workflow:
 *
 * 1. Create a new member account via join operation with valid registration data
 * 2. Immediately retrieve the user's reputation information using their member ID
 * 3. Validate that total_score is 0 for users with no votes
 * 4. Validate that topics_score is 0 (no topics created or voted on)
 * 5. Validate that replies_score is 0 (no replies created or voted on)
 * 6. Validate that upvotes_received is 0 (no upvotes received)
 * 7. Validate that downvotes_received is 0 (no downvotes received)
 * 8. Verify all expected fields are present in the response structure
 * 9. Confirm the zero-state correctly represents New Contributor tier
 *
 * This ensures the reputation system properly initializes for new users and
 * provides complete data even when no voting activity has occurred.
 */
export async function test_api_user_reputation_new_contributor_zero_score(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with valid registration data
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const newMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(newMember);

  // Step 2: Retrieve the user's reputation information immediately after account creation
  const reputation: IDiscussionBoardUserReputation =
    await api.functional.discussionBoard.users.reputation.at(connection, {
      userId: newMember.id,
    });
  typia.assert(reputation);

  // Step 3: Validate that all reputation metrics are initialized to zero
  TestValidator.equals(
    "total reputation score should be 0 for new user",
    reputation.total_score,
    0,
  );

  TestValidator.equals(
    "topics score should be 0 for new user",
    reputation.topics_score,
    0,
  );

  TestValidator.equals(
    "replies score should be 0 for new user",
    reputation.replies_score,
    0,
  );

  TestValidator.equals(
    "upvotes received should be 0 for new user",
    reputation.upvotes_received,
    0,
  );

  TestValidator.equals(
    "downvotes received should be 0 for new user",
    reputation.downvotes_received,
    0,
  );

  // Step 4: Verify the reputation record references the correct member
  TestValidator.equals(
    "reputation record should reference the new member",
    reputation.discussion_board_member_id,
    newMember.id,
  );
}
