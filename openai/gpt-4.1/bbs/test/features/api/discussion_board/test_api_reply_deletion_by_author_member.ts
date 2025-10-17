import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that a member can delete their own reply from a topic.
 *
 * This test covers the following workflow:
 *
 * 1. Register a new discussion board member.
 * 2. Post a new topic as the member.
 * 3. Post a reply to the created topic.
 * 4. Delete the reply using its ID.
 *
 * Note: There is currently no API to get topic details or fetch a topic's
 * replies after creation; therefore, we cannot assert the reply's deletion by
 * direct retrieval.
 */
export async function test_api_reply_deletion_by_author_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Post a new topic
  const topicInput = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }).slice(0, 60),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicInput,
    },
  );
  typia.assert(topic);

  // Step 3: Post a reply to the created topic as the same member
  const replyInput = {
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 15,
    }).slice(0, 2000),
  } satisfies IDiscussionBoardReply.ICreate;
  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: replyInput,
      },
    );
  typia.assert(reply);
  TestValidator.equals(
    "reply is associated with correct topic",
    reply.topic_id,
    topic.id,
  );
  TestValidator.equals(
    "reply is authored by the member",
    reply.author_member_id,
    member.id,
  );

  // Step 4: Delete the reply
  await api.functional.discussionBoard.member.topics.replies.erase(connection, {
    topicId: topic.id,
    replyId: reply.id,
  });
}
