import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test that a member cannot delete another member's topic on the discussion
 * board.
 *
 * This test covers a core business rule: only the original topic author (or
 * admins) can delete a topic. Steps:
 *
 * 1. Register Member A with a unique email/username and authenticate.
 * 2. Member A creates a topic (store topicId for later use).
 * 3. Register Member B with a different unique email/username (automatically
 *    authenticates as Member B).
 * 4. Attempt to delete Member A's topic using Member B's session.
 * 5. Confirm that the deletion is rejected; Member B is not authorized as the
 *    owner.
 */
export async function test_api_topic_deletion_not_authorized_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = RandomGenerator.name();
  const memberAPassword = typia.random<string & tags.Format<"password">>();

  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: memberAEmail,
      username: memberAUsername,
      password: memberAPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);

  // 2. Create a topic as Member A
  const topicSubject = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const topicContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 10,
    wordMax: 20,
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
  const topicId = topic.id;

  // 3. Register Member B (this switches the auth context for the connection)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = RandomGenerator.name();
  const memberBPassword = typia.random<string & tags.Format<"password">>();
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: memberBEmail,
      username: memberBUsername,
      password: memberBPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  // 4. Attempt to delete Member A's topic as Member B - expect failure
  await TestValidator.error(
    "member B should not be allowed to delete a topic owned by member A",
    async () => {
      await api.functional.discussionBoard.member.topics.erase(connection, {
        topicId,
      });
    },
  );
}
