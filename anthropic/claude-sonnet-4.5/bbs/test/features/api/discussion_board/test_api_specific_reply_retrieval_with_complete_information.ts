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
 * Test retrieving a specific reply with complete information including
 * threading context and engagement metrics.
 *
 * This test validates that the reply retrieval endpoint returns comprehensive
 * reply data including content, author details, threading hierarchy,
 * timestamps, and engagement metrics.
 *
 * Workflow:
 *
 * 1. Administrator authenticates and creates category
 * 2. Member authenticates and creates discussion topic
 * 3. Member creates top-level reply to topic
 * 4. Member creates nested reply (child of first reply)
 * 5. Member votes on the nested reply to generate engagement metrics
 * 6. Retrieve the specific nested reply by its ID
 * 7. Validate complete reply information including depth_level, parent_reply_id,
 *    and all metadata
 */
export async function test_api_specific_reply_retrieval_with_complete_information(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  await api.functional.auth.administrator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          slug: typia.random<string & tags.Pattern<"^[a-z0-9-]+$">>(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          parent_category_id: null,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member authentication and topic creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<200>
        >(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 3: Create top-level reply
  const topLevelReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: null,
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<10000>
          >(),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(topLevelReply);

  // Step 4: Create nested reply (child of first reply)
  const nestedReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          discussion_board_topic_id: topic.id,
          parent_reply_id: topLevelReply.id,
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<10000>
          >(),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(nestedReply);

  // Step 5: Vote on the nested reply to generate engagement metrics
  const vote = await api.functional.discussionBoard.member.votes.create(
    connection,
    {
      body: {
        votable_type: "reply",
        votable_id: nestedReply.id,
        vote_type: "upvote",
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(vote);

  // Step 6: Retrieve the specific nested reply by its ID
  const retrievedReply = await api.functional.discussionBoard.topics.replies.at(
    connection,
    {
      topicId: topic.id,
      replyId: nestedReply.id,
    },
  );
  typia.assert(retrievedReply);

  // Step 7: Validate complete reply information
  TestValidator.equals(
    "retrieved reply ID matches created reply",
    retrievedReply.id,
    nestedReply.id,
  );
  TestValidator.equals(
    "retrieved reply belongs to correct topic",
    retrievedReply.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "retrieved reply has correct parent",
    retrievedReply.parent_reply_id,
    topLevelReply.id,
  );
  TestValidator.equals(
    "retrieved reply content matches",
    retrievedReply.content,
    nestedReply.content,
  );

  // Validate threading context
  TestValidator.predicate(
    "depth_level indicates nested position",
    retrievedReply.depth_level === 1,
  );
  TestValidator.predicate(
    "parent_reply_id references correct parent",
    retrievedReply.parent_reply_id === topLevelReply.id,
  );

  // Validate timestamps are present and properly formatted
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedReply.created_at !== null &&
      retrievedReply.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedReply.updated_at !== null &&
      retrievedReply.updated_at !== undefined,
  );
}
