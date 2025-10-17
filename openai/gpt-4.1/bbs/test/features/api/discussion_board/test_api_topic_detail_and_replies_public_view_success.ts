import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate public topic detail fetching (with replies) for economic/political
 * discussion board.
 *
 * 1. Register a new member (for authoring topic/reply)
 * 2. Member creates a new topic
 * 3. Member posts a reply to the topic
 * 4. As public/guest (no auth), fetch topic detail using the topicId
 * 5. Validate that the response includes expected fields (subject, content, author
 *    username, timestamps) and at least one reply
 * 6. Replies are listed in ascending chronological order (by created_at)
 * 7. Ensure no sensitive info such as member email is present in topic/reply
 *    payloads
 * 8. Edge: Fetching a non-existent topicId returns an error.
 */
export async function test_api_topic_detail_and_replies_public_view_success(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 2. Member creates a new topic
  const topicInput = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topicInput },
  );
  typia.assert(topic);

  // 3. Member posts a reply to the topic
  const replyContent = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 12,
  });
  const replyInput = {
    content: replyContent,
  } satisfies IDiscussionBoardReply.ICreate;
  const reply =
    await api.functional.discussionBoard.member.topics.replies.create(
      connection,
      { topicId: topic.id, body: replyInput },
    );
  typia.assert(reply);

  // 4. As guest, fetch topic details
  const guestConn: api.IConnection = { ...connection, headers: {} };
  const fetched = await api.functional.discussionBoard.topics.at(guestConn, {
    topicId: topic.id,
  });
  typia.assert(fetched);

  // 5. Validate - Core topic fields
  TestValidator.equals("fetched id matches topic", fetched.id, topic.id);
  TestValidator.equals("subject matches", fetched.subject, topic.subject);
  TestValidator.equals("content matches", fetched.content, topic.content);

  // 6. Ensure author info for guests is safe (only username, no email/token)
  TestValidator.predicate(
    "author_member_id matches member (guests can't see email or token)",
    fetched.author_member_id === member.id &&
      (fetched as any).email === undefined &&
      (fetched as any).token === undefined,
  );

  // 7. Replies array exists and contains the reply, sorted by created_at ascending
  TestValidator.predicate(
    "has replies array",
    Array.isArray(fetched.discussion_board_replies) &&
      fetched.discussion_board_replies.length >= 1,
  );
  const foundReply = fetched.discussion_board_replies?.find(
    (r) => r.id === reply.id,
  );
  TestValidator.predicate("created reply is in replies", !!foundReply);
  if (
    fetched.discussion_board_replies &&
    fetched.discussion_board_replies.length > 1
  ) {
    const sorted = [...fetched.discussion_board_replies].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    TestValidator.equals(
      "replies should be sorted by created_at ascending",
      fetched.discussion_board_replies,
      sorted,
    );
  }
  // Replies' author info — check no email/token
  for (const r of fetched.discussion_board_replies ?? []) {
    TestValidator.predicate(
      "reply author safe info (no email/token)",
      (r as any).email === undefined && (r as any).token === undefined,
    );
  }

  // 8. Edge case: fetch non-existent topic
  await TestValidator.error(
    "fetching non-existent topic returns error",
    async () => {
      await api.functional.discussionBoard.topics.at(guestConn, {
        topicId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
