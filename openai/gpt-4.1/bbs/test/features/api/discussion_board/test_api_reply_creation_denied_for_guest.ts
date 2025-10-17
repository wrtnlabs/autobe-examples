import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Ensure that guests (unauthenticated) cannot post replies to admin-created
 * discussion topics.
 *
 * Steps:
 *
 * 1. Register an admin for topic creation.
 * 2. Log in as admin and create a topic.
 * 3. Build a guest (unauthenticated) connection object (headers: {}).
 * 4. Attempt posting a reply to the created topic using the guest connection.
 * 5. Verify the system rejects the unauthenticated reply attempt.
 */
export async function test_api_reply_creation_denied_for_guest(
  connection: api.IConnection,
) {
  // 1. Register admin (issue tokens)
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "AdminPassw0rd!",
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create topic as admin
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        subject: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 12,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // 3. Prepare guest (unauthenticated) connection
  const guestConn: api.IConnection = { ...connection, headers: {} };
  // 4. Attempt reply as guest
  await TestValidator.error(
    "guest cannot post a reply to admin topic",
    async () => {
      await api.functional.discussionBoard.admin.topics.replies.create(
        guestConn,
        {
          topicId: topic.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 4,
              wordMax: 10,
            }),
          } satisfies IDiscussionBoardReply.ICreate,
        },
      );
    },
  );
}
