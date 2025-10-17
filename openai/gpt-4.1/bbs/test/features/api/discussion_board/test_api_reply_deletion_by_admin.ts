import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that an admin can delete any reply in a discussion topic.
 *
 * This test covers the full admin happy-path scenario for reply deletion:
 *
 * 1. Register a new admin
 * 2. Create a new topic as the admin
 * 3. Post a reply as the admin
 * 4. Delete the reply as the admin
 * 5. (If an endpoint were available, confirm the reply is permanently deleted)
 */
export async function test_api_reply_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword as string & tags.Format<"password">,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new topic as the admin
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: {
        subject: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 18,
          wordMin: 3,
          wordMax: 9,
        }),
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Post a reply as the admin
  const reply: IDiscussionBoardReply =
    await api.functional.discussionBoard.admin.topics.replies.create(
      connection,
      {
        topicId: topic.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardReply.ICreate,
      },
    );
  typia.assert(reply);
  TestValidator.equals("reply belongs to topic", reply.topic_id, topic.id);

  // 4. Delete the reply as the admin
  await api.functional.discussionBoard.admin.topics.replies.erase(connection, {
    topicId: topic.id,
    replyId: reply.id,
  });
  // 5. No endpoint available to re-fetch topic or replies list for confirmation. Test ends after successful delete call.
}
