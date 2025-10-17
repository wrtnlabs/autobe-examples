import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Register a new member and immediately create a valid topic as that member on
 * the discussion board.
 *
 * This test simulates a standard end-user joining the board and posting a
 * topic, validating both flows. It ensures that after registration, the user
 * can post a topic and the returned topic entity matches the posted content and
 * is linked to the member account. Steps:
 *
 * 1. Generate a fresh member registration request (unique email, username,
 *    password).
 * 2. POST to /auth/member/join; confirm member was created and authorized.
 * 3. Create a valid topic body (subject/content within required lengths).
 * 4. POST to /discussionBoard/member/topics using the member session.
 * 5. Assert topic entity fields, including author_member_id = member.id, no admin
 *    author set, and field types.
 */
export async function test_api_member_topic_creation_success(
  connection: api.IConnection,
) {
  // 1. Generate a unique member registration
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardMember.ICreate;

  // 2. Register the member
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 3. Compose a valid topic (valid subject/content)
  const topicBody = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 8,
    }), // One sentence min 5 chars per word
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;

  // 4. Create the topic as this member
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicBody,
    });
  typia.assert(topic);

  // 5. Assert that topic fields match expectations
  TestValidator.equals(
    "author_member_id matches member.id",
    topic.author_member_id,
    member.id,
  );
  TestValidator.equals(
    "author_admin_id is null/undefined",
    topic.author_admin_id,
    null,
  );
  TestValidator.equals("subject matches", topic.subject, topicBody.subject);
  TestValidator.equals("content matches", topic.content, topicBody.content);
  TestValidator.predicate(
    "topic id is uuid",
    typeof topic.id === "string" && topic.id.length > 20,
  );
  TestValidator.predicate(
    "created_at exists",
    typeof topic.created_at === "string" && topic.created_at.length >= 20,
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof topic.updated_at === "string" && topic.updated_at.length >= 20,
  );
  // Optional: replies array can be undefined for no replies
  TestValidator.equals(
    "no replies on new topic",
    Array.isArray(topic.discussion_board_replies)
      ? topic.discussion_board_replies.length
      : 0,
    0,
  );
}
