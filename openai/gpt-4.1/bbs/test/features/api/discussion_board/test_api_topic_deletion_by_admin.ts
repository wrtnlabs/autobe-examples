import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test hard deletion of a discussion topic by an admin, ensuring admin can
 * delete any topic regardless of authorship.
 *
 * Scenario steps:
 *
 * 1. Register a new member as a regular user (topic author), and complete
 *    registration.
 * 2. Create a topic as this member.
 * 3. Register a new admin.
 * 4. As admin, call the erase endpoint to permanently delete the member's topic.
 * 5. (No topic index/read endpoint, but ensure no throw and operation completes
 *    successfully as API returns void.)
 * 6. (Optional) Attempt repeat deletion or deletion as non-admin for permission
 *    denial (if such error test is feasible with current endpoints, otherwise
 *    skip.)
 */
export async function test_api_topic_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.name();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword as string & tags.Format<"password">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. As member, create a topic
  const topicSubject = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const topicContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        subject: topicSubject,
        content: topicContent,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);
  TestValidator.equals(
    "topic subject matches input",
    topic.subject,
    topicSubject,
  );
  TestValidator.equals(
    "topic content matches input",
    topic.content,
    topicContent,
  );

  // 3. Register a new admin (context switches auth)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.name();
  const adminPassword: string = RandomGenerator.alphaNumeric(14);
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword as string & tags.Format<"password">,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);

  // 4. As admin, delete the topic authored by the member
  await api.functional.discussionBoard.admin.topics.erase(connection, {
    topicId: topic.id,
  });

  // 5. (Optional) Attempt to re-delete to verify error (if endpoint would throw, but not tested here)
  // 6. (Optional) If there were a topic index or read endpoint, attempt to access and check for not found or permission denied (skipped due to lack of endpoint)
}
