import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate that an authenticated admin can update a discussion board topic they
 * have authored.
 *
 * Steps:
 *
 * 1. Register a new admin account and authenticate (obtain admin session).
 * 2. Use this admin account to create a new topic (POST
 *    /discussionBoard/admin/topics).
 * 3. Update the topic's subject and content using the admin (PUT
 *    /discussionBoard/admin/topics/{topicId}).
 * 4. Assert that subject/content values are updated (persisted changes).
 * 5. Optionally, confirm the author_admin_id is consistent and only admins can
 *    perform the update.
 * 6. Ensure type safety and business rules for subject/content are enforced.
 */
export async function test_api_topic_update_by_author_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // 2. Create a topic as admin
  const createTopicBody = {
    subject: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardTopic.ICreate;
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: createTopicBody,
    });
  typia.assert(topic);
  TestValidator.equals(
    "created topic subject matches input",
    topic.subject,
    createTopicBody.subject,
  );
  TestValidator.equals(
    "created topic content matches input",
    topic.content,
    createTopicBody.content,
  );
  TestValidator.equals(
    "topic authored by admin",
    topic.author_admin_id,
    admin.id,
  );

  // 3. Prepare update payload
  const updateSubject = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 7,
    wordMax: 12,
  });
  const updateContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 3,
    wordMax: 8,
  });
  const updateBody = {
    subject: updateSubject,
    content: updateContent,
  } satisfies IDiscussionBoardTopic.IUpdate;

  // 4. Update the topic as the admin author
  const updated: IDiscussionBoardTopic =
    await api.functional.discussionBoard.admin.topics.update(connection, {
      topicId: topic.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 5. Validate that subject and content were updated
  TestValidator.equals(
    "topic subject was updated",
    updated.subject,
    updateSubject,
  );
  TestValidator.equals(
    "topic content was updated",
    updated.content,
    updateContent,
  );
  TestValidator.equals(
    "topic authored by same admin after update",
    updated.author_admin_id,
    admin.id,
  );

  // 6. Ensure update time changed (updated_at is newer or equal)
  TestValidator.predicate(
    "topic updated_at timestamp advanced or is unchanged (in case of identical input)",
    new Date(updated.updated_at).getTime() >=
      new Date(topic.updated_at).getTime(),
  );

  // 7. (Optional permission error check): Try updating as a random non-admin connection if possible (skipped, as API exposes only admin endpoints here)
}
