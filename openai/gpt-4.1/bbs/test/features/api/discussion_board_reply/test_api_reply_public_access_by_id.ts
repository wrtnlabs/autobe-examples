import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validates that replies are publicly accessible by ID, regardless of
 * authentication.
 *
 * 1. Register a new member (random email, username, password)
 * 2. As this member, create a topic (random subject/content)
 * 3. As same member, post a reply to that topic (random content)
 * 4. As guest (unauthenticated): fetch the reply using its topicId and replyId
 * 5. Validate reply fields (content, author_member_id, topic_id) match posted data
 * 6. Ensures that public/guest access returns valid data with correct linkage
 */
export async function test_api_reply_public_access_by_id(
  connection: api.IConnection,
) {
  // 1. Register member
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      username,
      password: password as string & tags.Format<"password">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create topic as member
  const topicBody = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topicBody },
  );
  typia.assert(topic);

  // 3. Post reply as member
  const replyContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  }) as string & tags.MinLength<3> & tags.MaxLength<2000>;
  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: { content: replyContent } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);

  // 4. As guest (unauthenticated), fetch the reply
  const guestConn: api.IConnection = { ...connection, headers: {} };
  const publicReply = await api.functional.discussionBoard.topics.replies.at(
    guestConn,
    {
      topicId: topic.id,
      replyId: reply.id,
    },
  );
  typia.assert(publicReply);
  // 5. Validate core reply fields are correct
  TestValidator.equals(
    "reply content matches",
    publicReply.content,
    replyContent,
  );
  TestValidator.equals(
    "reply topic_id matches",
    publicReply.topic_id,
    topic.id,
  );
  TestValidator.equals(
    "reply author_member_id matches",
    publicReply.author_member_id,
    member.id,
  );
}
