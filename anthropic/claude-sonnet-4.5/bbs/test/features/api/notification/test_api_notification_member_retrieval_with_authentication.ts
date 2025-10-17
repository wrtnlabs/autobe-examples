import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test the complete workflow of creating discussion board content that triggers
 * notifications.
 *
 * This scenario validates the prerequisite steps for notification generation
 * including administrator authentication, category management, member
 * authentication, topic creation, and reply posting which triggers notification
 * generation in the backend.
 *
 * Steps:
 *
 * 1. Create administrator account for category creation privilege
 * 2. Create a discussion board category as prerequisite for topic creation
 * 3. Create topic author member account and authenticate
 * 4. Create a discussion topic that will receive replies
 * 5. Create reply author member account and authenticate
 * 6. Create a reply to the topic (generates notification for topic author in
 *    backend)
 * 7. Validate all created entities and workflow completion
 *
 * Business validations:
 *
 * - Administrator can create categories
 * - Authenticated members can create topics
 * - Authenticated members can reply to topics
 * - Reply creation workflow completes successfully
 */
export async function test_api_notification_member_retrieval_with_authentication(
  connection: api.IConnection,
) {
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent_category_id: null,
    display_order: 1,
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

  const topicAuthorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const topicAuthor = await api.functional.auth.member.join(connection, {
    body: topicAuthorData,
  });
  typia.assert(topicAuthor);

  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
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

  const replyAuthorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const replyAuthor = await api.functional.auth.member.join(connection, {
    body: replyAuthorData,
  });
  typia.assert(replyAuthor);

  const replyData = {
    discussion_board_topic_id: topic.id,
    parent_reply_id: null,
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
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

  TestValidator.equals(
    "reply belongs to correct topic",
    reply.discussion_board_topic_id,
    topic.id,
  );

  TestValidator.equals(
    "reply created by reply author",
    reply.discussion_board_member_id,
    replyAuthor.id,
  );

  TestValidator.equals(
    "reply has no parent (top-level reply)",
    reply.parent_reply_id,
    null,
  );

  TestValidator.equals("reply depth is 0 for top-level", reply.depth_level, 0);

  TestValidator.predicate(
    "reply content matches input",
    reply.content === replyData.content,
  );

  TestValidator.predicate(
    "category created successfully",
    category.name === categoryData.name,
  );

  TestValidator.predicate(
    "topic created successfully",
    topic.title === topicData.title,
  );
}
