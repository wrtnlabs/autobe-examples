import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that an admin user can update their own reply in a discussion board
 * topic.
 *
 * This test covers the following admin workflow:
 *
 * 1. Register a new admin account (with unique email/username).
 * 2. Create a topic as this admin user (providing subject/content).
 * 3. Post a reply to the topic as the same admin.
 * 4. Update the reply's content via the admin reply update endpoint.
 * 5. Verify:
 *
 *    - Reply content actually changed
 *    - Updated_at timestamp updates
 *    - Only the intended field is changed, unchanged fields (id, topic_id,
 *         author_admin_id, created_at) remain the same
 *    - API response after update is valid
 *    - (Implicitly) No errors for performing self-author update as admin
 */
export async function test_api_reply_update_by_admin_author(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const createAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: createAdminBody,
  });
  typia.assert(admin);

  // 2. Create a topic as admin
  const createTopicBody = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    { body: createTopicBody },
  );
  typia.assert(topic);
  TestValidator.equals(
    "topic author is admin",
    topic.author_admin_id,
    admin.id,
  );

  // 3. Post a reply to the topic as admin
  const replyContent = RandomGenerator.paragraph({ sentences: 2 });
  const createReplyBody = {
    content: replyContent,
  } satisfies IDiscussionBoardReply.ICreate;
  const reply =
    await api.functional.discussionBoard.admin.topics.replies.create(
      connection,
      { topicId: topic.id, body: createReplyBody },
    );
  typia.assert(reply);
  TestValidator.equals(
    "reply author is admin",
    reply.author_admin_id,
    admin.id,
  );
  TestValidator.equals("reply topic match", reply.topic_id, topic.id);
  TestValidator.equals("reply content match", reply.content, replyContent);

  // Save pre-update fields
  const {
    id,
    topic_id,
    author_admin_id,
    created_at,
    updated_at: oldUpdatedAt,
  } = reply;

  // 4. Update the reply's content as admin
  const newContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 8,
    wordMax: 12,
  });
  const updateReplyBody = {
    content: newContent,
  } satisfies IDiscussionBoardReply.IUpdate;
  const updated =
    await api.functional.discussionBoard.admin.topics.replies.update(
      connection,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: updateReplyBody,
      },
    );
  typia.assert(updated);

  // 5. Verify reply was correctly updated
  TestValidator.equals("reply id stays same", updated.id, id);
  TestValidator.equals("reply topic_id stays same", updated.topic_id, topic_id);
  TestValidator.equals(
    "reply author stays same",
    updated.author_admin_id,
    author_admin_id,
  );
  TestValidator.equals(
    "reply created_at stays same",
    updated.created_at,
    created_at,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updated.updated_at,
    oldUpdatedAt,
  );
  TestValidator.equals(
    "reply content actually updated",
    updated.content,
    newContent,
  );
}
