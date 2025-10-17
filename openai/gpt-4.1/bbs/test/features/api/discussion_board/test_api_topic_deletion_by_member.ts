import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that a discussion board member can permanently delete their own
 * topic.
 *
 * 1. Register a new member with random valid credentials (email, username,
 *    password).
 * 2. As the registered member, create a new topic with unique subject/content.
 * 3. Delete the topic using the member account and topicId.
 * 4. (Optional) Attempt to re-retrieve the topic to ensure it's no longer
 *    available - expect error.
 * 5. (Optional) If API allows, check that all replies to the topic (if any) are
 *    also deleted—this is not directly covered since reply APIs are not
 *    present.
 * 6. Validate fully successful deletion with no errors.
 */
export async function test_api_topic_deletion_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(10),
    },
  });
  typia.assert(member);

  // 2. Create a new topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        subject: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 12,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 15,
          sentenceMax: 25,
          wordMin: 4,
          wordMax: 9,
        }),
      },
    },
  );
  typia.assert(topic);
  TestValidator.equals(
    "topic author is member",
    topic.author_member_id,
    member.id,
  );

  // 3. Delete the topic
  await api.functional.discussionBoard.member.topics.erase(connection, {
    topicId: topic.id,
  });

  // 4. Validate topic is no longer retrievable (skipped—no API for re-fetching a single topic as per provided API list). If possible, add error assertion here in future.
  // 5. Validate cascade delete for replies is not directly testable via current API set.
  // 6. Test completes if no errors thrown
}
