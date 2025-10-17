import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReply";

/**
 * Verify any user (including guests) can retrieve a paginated list of replies
 * for a topic. Test steps:
 *
 * 1. Register a member.
 * 2. As a member, create a topic.
 * 3. As a guest, fetch replies for that topic.
 * 4. Confirm empty results when no replies exist.
 */
export async function test_api_replies_public_listing_for_topic(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. As member, create a topic
  const topicSubject = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 12,
  });
  const topicContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        subject: topicSubject,
        content: topicContent,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 3. Switch to guest (unauthenticated)
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // 4. As guest, get replies for topic (should be empty)
  const repliesPage = await api.functional.discussionBoard.topics.replies.index(
    guestConnection,
    {
      topicId: topic.id,
      body: {}, // use default pagination
    },
  );
  typia.assert(repliesPage);

  TestValidator.equals(
    "replies listing for new topic should be empty",
    repliesPage.data,
    [],
  );
}
