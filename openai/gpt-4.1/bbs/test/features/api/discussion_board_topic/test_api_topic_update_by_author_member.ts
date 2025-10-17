import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test that an authenticated member can update their own topic's subject and
 * content.
 *
 * 1. Register a new member (authorMember), authenticate, and create a topic.
 * 2. Update the subject/content as the original author; verify updates are
 *    applied.
 * 3. Register another member (otherMember), authenticate as otherMember, and
 *    attempt to update the topic; ensure permission is denied.
 */
export async function test_api_topic_update_by_author_member(
  connection: api.IConnection,
) {
  // 1. Register member (author) and create topic
  const authorMemberEmail: string =
    RandomGenerator.alphaNumeric(10) + "@authtest.com";
  const authorUsername: string = RandomGenerator.name();
  const authorPassword: string = RandomGenerator.alphaNumeric(12);
  const author: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: authorMemberEmail,
        username: authorUsername,
        password: authorPassword as string & tags.Format<"password">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(author);

  const createPayload = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const createdTopic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: createPayload,
    });
  typia.assert(createdTopic);
  TestValidator.equals(
    "topic.subject matches",
    createdTopic.subject,
    createPayload.subject,
  );
  TestValidator.equals(
    "topic.content matches",
    createdTopic.content,
    createPayload.content,
  );

  // 2. Update subject/content as the original member (author)
  const updatePayload = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 15,
    }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 20,
      sentenceMax: 30,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardTopic.IUpdate;
  const updated: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: createdTopic.id,
      body: updatePayload,
    });
  typia.assert(updated);
  TestValidator.equals(
    "updated.subject matches",
    updated.subject,
    updatePayload.subject,
  );
  TestValidator.equals(
    "updated.content matches",
    updated.content,
    updatePayload.content,
  );
  TestValidator.equals(
    "author_member_id is unchanged",
    updated.author_member_id,
    author.id,
  );

  // 3. Register another member, authenticate, and attempt forbidden update
  const otherEmail: string = RandomGenerator.alphaNumeric(11) + "@authtest.com";
  const otherUsername: string = RandomGenerator.name();
  const otherPassword: string = RandomGenerator.alphaNumeric(13);
  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherEmail,
        username: otherUsername,
        password: otherPassword as string & tags.Format<"password">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(otherMember);

  // Switch authentication (by join, SDK auto-handles token)
  // Try to update as unauthorized user (should fail)
  await TestValidator.error(
    "other member should not update topic",
    async () => {
      await api.functional.discussionBoard.member.topics.update(connection, {
        topicId: createdTopic.id,
        body: {
          subject: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 13,
            wordMax: 17,
          }),
        } satisfies IDiscussionBoardTopic.IUpdate,
      });
    },
  );
}
