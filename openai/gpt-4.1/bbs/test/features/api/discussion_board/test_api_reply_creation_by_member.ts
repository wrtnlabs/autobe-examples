import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test that an authenticated member can create a reply to an existing topic on
 * the economic/political discussion board.
 *
 * Steps:
 *
 * 1. Register as a new member (calls /auth/member/join)
 * 2. Create a new discussion topic as this member (calls
 *    /discussionBoard/member/topics)
 * 3. Post a reply to the topic as the member (calls
 *    /discussionBoard/member/topics/{topicId}/replies)
 * 4. Validate that the reply is created, has correct topic and author references,
 *    and the reply is included in the topic's reply list
 */
export async function test_api_reply_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register as a new member
  const memberBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // 2. Create a new topic as this member (connection now authenticated)
  const topicBody = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 2,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicBody,
    },
  );
  typia.assert(topic);
  TestValidator.equals(
    "topic subject matches input",
    topic.subject,
    topicBody.subject,
  );
  TestValidator.equals(
    "topic content matches input",
    topic.content,
    topicBody.content,
  );
  TestValidator.equals(
    "topic author is current member",
    topic.author_member_id,
    member.id,
  );

  // 3. Post a reply to the topic as the member
  const replyContent = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 12,
  }) as string & tags.MinLength<3> & tags.MaxLength<2000>;
  const replyBody = {
    content: replyContent,
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
  TestValidator.equals(
    "reply topic_id matches topic",
    reply.topic_id,
    topic.id,
  );
  TestValidator.equals(
    "reply author_member_id matches member",
    reply.author_member_id,
    member.id,
  );
  TestValidator.equals(
    "reply content matches input",
    reply.content,
    replyContent,
  );

  // 4. Validate that reply shows in topic.reply list (requires fresh topic fetch)
  // Assume that fetching the topic again will include the latest replies array
  const topicReloaded =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicBody,
    });
  typia.assert(topicReloaded);
  TestValidator.predicate(
    "reply is visible in topic's reply list",
    Array.isArray(topicReloaded.discussion_board_replies) &&
      topicReloaded.discussion_board_replies.some((r) => r.id === reply.id),
  );
}
