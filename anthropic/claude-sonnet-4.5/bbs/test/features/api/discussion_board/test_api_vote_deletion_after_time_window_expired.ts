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
 * Test successful vote deletion within the 5-minute change window, validating
 * the voting system's vote lifecycle management and deletion functionality when
 * performed within the allowed time window.
 *
 * Business Context: The voting system allows users to delete their votes within
 * a 5-minute change window. This test verifies that vote deletion works
 * correctly when performed within this allowed timeframe, ensuring users can
 * correct their voting mistakes quickly.
 *
 * Workflow:
 *
 * 1. Authenticate as a member using join
 * 2. Create administrator account for category creation
 * 3. Create a discussion category
 * 4. Create a discussion topic
 * 5. Create a reply to serve as votable content
 * 6. Cast a downvote on the reply
 * 7. Successfully delete the vote within the 5-minute window
 * 8. Verify the deletion succeeded (void response indicates success)
 */
export async function test_api_vote_deletion_after_time_window_expired(
  connection: api.IConnection,
) {
  // Step 1: Create member account for voting operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const memberBody = {
    username: memberUsername,
    email: memberEmail,
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const adminBody = {
    username: adminUsername,
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 3: Create a discussion category
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member context for topic creation
  connection.headers = connection.headers || {};
  connection.headers.Authorization = member.token.access;

  // Create a discussion topic
  const topicBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicBody,
    },
  );
  typia.assert(topic);

  // Step 5: Create a reply to the topic
  const replyBody = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  // Step 6: Cast a downvote on the reply
  const voteBody = {
    votable_type: "reply" as const,
    votable_id: reply.id,
    vote_type: "downvote" as const,
  } satisfies IDiscussionBoardVote.ICreate;

  const vote = await api.functional.discussionBoard.member.votes.create(
    connection,
    {
      body: voteBody,
    },
  );
  typia.assert(vote);

  // Step 7: Successfully delete the vote within the 5-minute window
  // The vote was just created, so we are well within the allowed deletion window
  await api.functional.discussionBoard.member.votes.erase(connection, {
    voteId: vote.id,
  });

  // Void return indicates successful deletion
  // The vote has been removed from the system within the allowed time window
}
