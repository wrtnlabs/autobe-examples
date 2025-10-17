import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validates prevention of duplicate topic creation by the same member.
 *
 * - Register a new member
 * - Authenticate as that member (implicit in join response)
 * - Create and post a valid, fixed topic (subject/content)
 * - Immediately attempt to create another topic with identical subject and
 *   content
 * - The first should succeed, the second should fail with a business error for
 *   duplication
 */
export async function test_api_member_topic_creation_duplicate(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "A!1"; // ensure some complexity for password field
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Prepare a valid, fixed topic subject and content (reuse for both creations)
  // Use minimum and maximum requirements (subject: 5~120, content: 10~4000)
  const subject = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 20,
  });
  const content = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 6,
    sentenceMax: 10,
    wordMin: 5,
    wordMax: 18,
  });

  // 3. Successfully create the first topic
  const topicBody = {
    subject,
    content,
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicBody,
    });
  typia.assert(topic);
  TestValidator.equals("created topic subject matches", topic.subject, subject);
  TestValidator.equals("created topic content matches", topic.content, content);

  // 4. Attempt to create a duplicate topic (same subject/content)
  await TestValidator.error(
    "should fail to create duplicate topic (same member, same subject/content)",
    async () => {
      await api.functional.discussionBoard.member.topics.create(connection, {
        body: { subject, content } satisfies IDiscussionBoardTopic.ICreate,
      });
    },
  );
}
