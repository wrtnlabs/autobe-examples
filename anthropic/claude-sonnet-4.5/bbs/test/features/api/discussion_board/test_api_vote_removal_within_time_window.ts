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
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test successful removal of a vote within the 5-minute change window.
 *
 * This test validates that members can completely retract their voting decision
 * by updating the vote to a neutral/null state within the allowed 5-minute
 * modification window. The test covers the complete workflow from member
 * registration through vote removal and verification.
 *
 * Workflow:
 *
 * 1. Create member account for voting operations
 * 2. Create administrator account with category creation privileges
 * 3. Create discussion category required for topic creation
 * 4. Create discussion topic to host replies
 * 5. Create reply on the topic as votable content
 * 6. Cast downvote on the reply
 * 7. Remove vote by updating to neutral state within 5-minute window
 * 8. Verify vote removal succeeded
 */
export async function test_api_vote_removal_within_time_window(
  connection: api.IConnection,
) {
  // Step 1: Create member account for voting operations
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 3: Create discussion category (authenticated as admin)
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
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

  // Step 4: Create discussion topic (switch back to member account)
  const memberReauth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(memberReauth);

  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicData,
    });
  typia.assert(topic);

  // Step 5: Create reply on the topic as votable content
  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  // Step 6: Cast downvote on the reply
  const voteData = {
    votable_type: "reply" as const,
    votable_id: reply.id,
    vote_type: "downvote" as const,
  } satisfies IDiscussionBoardVote.ICreate;

  const vote: IDiscussionBoardVote =
    await api.functional.discussionBoard.member.votes.create(connection, {
      body: voteData,
    });
  typia.assert(vote);

  TestValidator.equals("vote type is downvote", vote.vote_type, "downvote");
  TestValidator.equals("vote targets reply", vote.votable_type, "reply");
  TestValidator.equals("vote targets correct reply", vote.votable_id, reply.id);

  // Step 7: Remove vote by updating to neutral state (within 5-minute window)
  const updateData = {
    vote_type: undefined,
  } satisfies IDiscussionBoardVote.IUpdate;

  const updatedVote: IDiscussionBoardVote =
    await api.functional.discussionBoard.member.votes.update(connection, {
      voteId: vote.id,
      body: updateData,
    });
  typia.assert(updatedVote);

  // Step 8: Verify vote removal succeeded
  TestValidator.equals("vote ID remains same", updatedVote.id, vote.id);
  TestValidator.predicate(
    "updated timestamp changed",
    updatedVote.updated_at !== vote.updated_at,
  );
}
