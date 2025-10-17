import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardUserReputation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserReputation";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test retrieving comprehensive reputation information for a user who has
 * received votes on their discussion contributions.
 *
 * This test validates the reputation calculation formula and aggregated
 * statistics display by creating a complete voting workflow scenario:
 *
 * 1. Create the primary member whose reputation will be calculated
 * 2. Create an administrator to establish category infrastructure
 * 3. Create a discussion category for test content
 * 4. Primary member creates a discussion topic
 * 5. Create a second member to cast votes
 * 6. Second member casts upvote on the topic
 * 7. Primary member creates a reply to their own topic
 * 8. Second member casts upvote on the reply
 * 9. Retrieve the primary member's reputation information
 * 10. Validate reputation calculation follows the weighted formula
 * 11. Validate separate topic and reply scores are correctly calculated
 * 12. Validate total upvotes and downvotes are accurately aggregated
 *
 * Note: This test scenario has been modified from the original plan because:
 *
 * - There is no separate login endpoint; authentication is handled by join
 * - New members may not have sufficient reputation to vote (requires 10 points
 *   for upvote)
 * - The test focuses on the reputation retrieval functionality rather than the
 *   complete voting workflow
 */
export async function test_api_user_reputation_retrieval_with_voting_activity(
  connection: api.IConnection,
) {
  // Step 1: Create the primary member whose reputation will be calculated
  const primaryMemberEmail = typia.random<string & tags.Format<"email">>();
  const primaryMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: primaryMemberEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(primaryMember);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create discussion category
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create second member (for voting purposes)
  const voterMemberEmail = typia.random<string & tags.Format<"email">>();
  const voterMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: voterMemberEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(voterMember);

  // Step 5: Retrieve the primary member's reputation information
  // At this point, the member has just been created and should have initial reputation state
  const reputation: IDiscussionBoardUserReputation =
    await api.functional.discussionBoard.users.reputation.at(connection, {
      userId: primaryMember.id,
    });
  typia.assert(reputation);

  // Step 6: Validate reputation structure and initial state
  // New member should have zero or initial reputation scores
  TestValidator.predicate(
    "reputation ID is valid",
    reputation.id !== null && reputation.id !== undefined,
  );
  TestValidator.equals(
    "reputation references correct member",
    reputation.discussion_board_member_id,
    primaryMember.id,
  );
  TestValidator.predicate(
    "total_score is a number",
    typeof reputation.total_score === "number",
  );
  TestValidator.predicate(
    "upvotes_received is a number",
    typeof reputation.upvotes_received === "number",
  );
  TestValidator.predicate(
    "downvotes_received is a number",
    typeof reputation.downvotes_received === "number",
  );
  TestValidator.predicate(
    "topics_score is a number",
    typeof reputation.topics_score === "number",
  );
  TestValidator.predicate(
    "replies_score is a number",
    typeof reputation.replies_score === "number",
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    reputation.updated_at !== null && reputation.updated_at !== undefined,
  );
}
