import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Tests that members can only cast one vote per content item.
 *
 * This test validates the one-vote-per-content business rule by ensuring
 * members can only cast one vote per content item. The test creates two
 * members, has the first member create a topic, then has the second member
 * upvote the topic, and finally attempts to vote again on the same topic. The
 * test verifies that the system rejects the duplicate vote attempt, ensuring
 * vote integrity and preventing vote manipulation through multiple voting.
 *
 * Test workflow:
 *
 * 1. Create an administrator account to enable category creation
 * 2. Administrator creates a category required for topic creation
 * 3. Create the first member account (topic author)
 * 4. First member creates a topic to be voted on
 * 5. Create the second member account (voter)
 * 6. Second member successfully casts an upvote on the topic
 * 7. Second member attempts to vote again on the same topic
 * 8. Verify that the duplicate vote attempt is rejected with an error
 */
export async function test_api_vote_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Administrator creates a category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account (topic author)
  const authorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const author: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: authorData,
    });
  typia.assert(author);

  // Step 4: First member creates a topic
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Create second member account (voter)
  const voterData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const voter: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: voterData,
    });
  typia.assert(voter);

  // Step 6: Second member casts an upvote on the topic
  const voteData = {
    votable_type: "topic" as const,
    votable_id: topic.id,
    vote_type: "upvote" as const,
  } satisfies IDiscussionBoardVote.ICreate;

  const firstVote: IDiscussionBoardVote =
    await api.functional.discussionBoard.member.votes.create(connection, {
      body: voteData,
    });
  typia.assert(firstVote);

  // Step 7 & 8: Attempt to vote again and verify rejection
  await TestValidator.error("duplicate vote should be rejected", async () => {
    await api.functional.discussionBoard.member.votes.create(connection, {
      body: voteData,
    });
  });
}
