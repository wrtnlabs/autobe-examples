import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that a member can update their own reply within a topic.
 *
 * 1. Register a member account with random email, username, and password.
 * 2. Create a new discussion topic as this member.
 * 3. Post an initial reply to the created topic as this member.
 * 4. Update the reply's content using the update API for replies by author.
 * 5. Ensure the content of the reply has changed after the update.
 * 6. Validate that the updated_at timestamp is updated accordingly and
 *    author/member IDs are preserved.
 */
export async function test_api_reply_update_by_member_author(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: "P@ssw0rd!23",
  } satisfies IDiscussionBoardMember.ICreate;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberInput });
  typia.assert(member);

  // 2. Create topic
  const topicInput = {
    subject: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 9,
    }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 18,
      wordMin: 3,
      wordMax: 12,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicInput,
    });
  typia.assert(topic);

  // 3. Create reply
  const replyInput = {
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 20,
    }),
  } satisfies IDiscussionBoardReply.ICreate;
  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyInput,
      },
    );
  typia.assert(reply);

  // 4. Update the reply
  const newContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 15,
  });
  const updatedInput = {
    content: newContent,
  } satisfies IDiscussionBoardReply.IUpdate;
  const updated: IDiscussionBoardReply =
    await api.functional.discussionBoard.member.topics.replies.update(
      connection,
      {
        topicId: topic.id,
        replyId: reply.id,
        body: updatedInput,
      },
    );
  typia.assert(updated);

  // 5. Assert the reply's content has changed
  TestValidator.notEquals(
    "reply content must change after update",
    updated.content,
    reply.content,
  );
  TestValidator.equals(
    "updated content matches input",
    updated.content,
    newContent,
  );
  TestValidator.equals(
    "topic ID remains the same",
    updated.topic_id,
    reply.topic_id,
  );
  TestValidator.equals(
    "author member ID unchanged",
    updated.author_member_id,
    reply.author_member_id,
  );
  TestValidator.notEquals(
    "updated_at must be new",
    updated.updated_at,
    reply.updated_at,
  );
}
