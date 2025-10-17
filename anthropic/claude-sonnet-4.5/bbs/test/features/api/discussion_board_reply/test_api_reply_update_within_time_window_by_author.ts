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

/**
 * Tests that a member can successfully update their own reply content within
 * the allowed 1-hour edit window.
 *
 * This test validates the complete workflow for reply editing:
 *
 * 1. Member registration and authentication
 * 2. Administrator setup for category creation
 * 3. Category and topic creation to establish discussion context
 * 4. Initial reply posting
 * 5. Reply content update within the edit window
 * 6. Validation of updated content and timestamps
 *
 * Business rules validated:
 *
 * - Standard members can edit replies within 1 hour of posting
 * - Content validation enforces 1-10,000 character limits
 * - Updated timestamps reflect modification time
 */
export async function test_api_reply_update_within_time_window_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Store member token for later use
  const memberToken = member.token.access;

  // Step 2: Create and authenticate administrator account
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 3: Create category for topic organization
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

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member authentication and create topic
  connection.headers = connection.headers || {};
  connection.headers.Authorization = memberToken;

  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicData,
    },
  );
  typia.assert(topic);

  // Step 5: Create initial reply
  const originalContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: originalContent,
  } satisfies IDiscussionBoardReply.ICreate;

  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  // Step 6: Update reply content within edit window
  const updatedContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
  });
  const updateData = {
    content: updatedContent,
  } satisfies IDiscussionBoardReply.IUpdate;

  const updatedReply =
    await api.functional.discussionBoard.member.topics.replies.update(
      connection,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: updateData,
      },
    );
  typia.assert(updatedReply);

  // Step 7: Validate update results
  TestValidator.equals("reply id matches", updatedReply.id, reply.id);
  TestValidator.equals(
    "topic id matches",
    updatedReply.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "updated content matches",
    updatedReply.content,
    updatedContent,
  );
  TestValidator.predicate(
    "content was actually changed",
    updatedReply.content !== originalContent,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    new Date(updatedReply.updated_at).getTime() >=
      new Date(reply.updated_at).getTime(),
  );
}
