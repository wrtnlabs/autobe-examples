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
 * Test reputation calculation when a user receives downvotes on their content,
 * validating that negative reputation changes are correctly calculated
 * according to the weighted formula.
 *
 * This test validates the reputation system's handling of negative voting
 * activity:
 *
 * - Topic downvotes reduce reputation by 2 points each
 * - Reply downvotes reduce reputation by 1 point each
 * - Net reputation correctly reflects upvotes minus weighted downvotes
 * - Negative reputation is displayed accurately when downvotes exceed upvotes
 * - Downvote counts are tracked separately from upvotes
 *
 * Business rules enforced:
 *
 * - Only users with 50+ reputation can downvote
 * - Users cannot downvote their own content
 * - Weighted formula: (topic upvotes × 5) - (topic downvotes × 2) + (reply
 *   upvotes × 2) - (reply downvotes × 1)
 */
export async function test_api_user_reputation_negative_votes_calculation(
  connection: api.IConnection,
) {
  // Step 1: Create target member whose content will receive downvotes
  const targetMemberEmail = typia.random<string & tags.Format<"email">>();
  const targetMemberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: targetMemberEmail,
    password: "SecurePass123!",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const targetConnection = { ...connection };
  const targetMember = await api.functional.auth.member.join(targetConnection, {
    body: targetMemberBody,
  });
  typia.assert(targetMember);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: adminEmail,
    password: "AdminPass123!",
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const adminConnection = { ...connection };
  const admin = await api.functional.auth.administrator.join(adminConnection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 3: Create discussion category for test content
  const categoryBody = {
    name: "Test Economics",
    slug: "test-economics",
    description: "Test category for economics discussions",
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      adminConnection,
      { body: categoryBody },
    );
  typia.assert(category);

  // Step 4: Target member creates a topic
  const targetTopicBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const targetTopic = await api.functional.discussionBoard.member.topics.create(
    targetConnection,
    { body: targetTopicBody },
  );
  typia.assert(targetTopic);

  // Step 5: Create voting member (who will cast downvotes)
  const votingMemberEmail = typia.random<string & tags.Format<"email">>();
  const votingMemberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: votingMemberEmail,
    password: "VoterPass123!",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const votingConnection = { ...connection };
  const votingMember = await api.functional.auth.member.join(votingConnection, {
    body: votingMemberBody,
  });
  typia.assert(votingMember);

  // Step 6: Build voting member's reputation to 50+ points
  // Need at least 10 topic upvotes to get 50 points (10 × 5 = 50)
  const votingMemberTopics = await ArrayUtil.asyncRepeat(10, async () => {
    const topicBody = {
      title: RandomGenerator.paragraph({ sentences: 5 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
      category_id: category.id,
      tag_ids: null,
    } satisfies IDiscussionBoardTopic.ICreate;

    const topic = await api.functional.discussionBoard.member.topics.create(
      votingConnection,
      { body: topicBody },
    );
    typia.assert(topic);
    return topic;
  });

  // Step 7: Target member upvotes voting member's topics to build reputation
  await ArrayUtil.asyncForEach(votingMemberTopics, async (topic) => {
    const upvote = await api.functional.discussionBoard.member.votes.create(
      targetConnection,
      {
        body: {
          votable_type: "topic",
          votable_id: topic.id,
          vote_type: "upvote",
        } satisfies IDiscussionBoardVote.ICreate,
      },
    );
    typia.assert(upvote);
  });

  // Step 8: Voting member casts downvote on target's topic
  const topicDownvote =
    await api.functional.discussionBoard.member.votes.create(votingConnection, {
      body: {
        votable_type: "topic",
        votable_id: targetTopic.id,
        vote_type: "downvote",
      } satisfies IDiscussionBoardVote.ICreate,
    });
  typia.assert(topicDownvote);

  // Step 9: Target member creates a reply
  const targetReplyBody = {
    discussion_board_topic_id: targetTopic.id,
    parent_reply_id: null,
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IDiscussionBoardReply.ICreate;

  const targetReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      targetConnection,
      {
        topicId: targetTopic.id,
        body: targetReplyBody,
      },
    );
  typia.assert(targetReply);

  // Step 10: Voting member casts downvote on the reply
  const replyDownvote =
    await api.functional.discussionBoard.member.votes.create(votingConnection, {
      body: {
        votable_type: "reply",
        votable_id: targetReply.id,
        vote_type: "downvote",
      } satisfies IDiscussionBoardVote.ICreate,
    });
  typia.assert(replyDownvote);

  // Step 11: Retrieve target member's reputation
  const reputation = await api.functional.discussionBoard.users.reputation.at(
    votingConnection,
    { userId: targetMember.id },
  );
  typia.assert(reputation);

  // Step 12: Validate reputation calculations
  // Expected: 1 topic downvote × -2 = -2, 1 reply downvote × -1 = -1, total = -3
  TestValidator.equals(
    "total downvotes received",
    reputation.downvotes_received,
    2,
  );
  TestValidator.equals(
    "topics score is negative from downvotes",
    reputation.topics_score,
    -2,
  );
  TestValidator.equals(
    "replies score is negative from downvotes",
    reputation.replies_score,
    -1,
  );
  TestValidator.equals(
    "total reputation reflects weighted downvotes",
    reputation.total_score,
    -3,
  );
  TestValidator.predicate(
    "reputation can go negative",
    reputation.total_score < 0,
  );
}
