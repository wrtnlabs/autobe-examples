import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that discussion board admin topic creation is subject to rate
 * limiting.
 *
 * This test ensures an admin can create up to 5 topics in the forum within a
 * rate-limited window (e.g., 1 hour), but receives an error when attempting to
 * create a 6th topic within the same window.
 *
 * Steps:
 *
 * 1. Register an admin using unique credentials.
 * 2. Create 5 topics as the admin; each should succeed and return a valid topic
 *    object.
 * 3. Attempt to create a 6th topic. This must fail due to rate limiting, and a
 *    rate limit error should be raised.
 */
export async function test_api_admin_topic_creation_rate_limit(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(admin);

  // 2. Create 5 topics as the admin; each must succeed
  const createdTopics: IDiscussionBoardTopic[] = [];
  for (let i = 0; i < 5; ++i) {
    const topicBody = {
      subject: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 8,
        wordMax: 12,
      }),
      content: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 10,
        sentenceMax: 16,
      }),
    } satisfies IDiscussionBoardTopic.ICreate;

    const topic: IDiscussionBoardTopic =
      await api.functional.discussionBoard.admin.topics.create(connection, {
        body: topicBody,
      });
    typia.assert(topic);
    createdTopics.push(topic);
    TestValidator.equals(
      `topic creation #${i + 1} should succeed`,
      typeof topic.id,
      "string",
    );
  }

  // 3. Attempt 6th topic; must fail due to rate limit
  const sixthBody = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 12,
    }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 16,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;

  await TestValidator.error(
    "6th topic creation should fail (rate limit)",
    async () => {
      await api.functional.discussionBoard.admin.topics.create(connection, {
        body: sixthBody,
      });
    },
  );
}
