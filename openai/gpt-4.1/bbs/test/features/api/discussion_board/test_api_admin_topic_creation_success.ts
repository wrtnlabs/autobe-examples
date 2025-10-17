import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReply";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Validate admin topic creation flow.
 *
 * 1. Register an admin.
 * 2. Use the newly authenticated admin to create a discussion topic (subject &
 *    content must meet length constraints).
 * 3. Confirm that the created topic object is well-formed, credited as admin
 *    author, and contains provided subject/content as well as system fields.
 */
export async function test_api_admin_topic_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword satisfies string & tags.Format<"password">,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.equals("registered admin email", adminAuth.email, adminEmail);
  TestValidator.equals(
    "registered admin username",
    adminAuth.username,
    adminUsername,
  );

  // 2. Create a new topic as this admin
  const topicSubject = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const topicContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 25,
    wordMin: 3,
    wordMax: 8,
  });
  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: {
        subject: topicSubject,
        content: topicContent,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 3. Validate topic fields
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
  TestValidator.predicate(
    "author_admin_id is present and correct type",
    typeof topic.author_admin_id === "string" && !!topic.author_admin_id,
  );
  TestValidator.equals(
    "topic has no member author",
    topic.author_member_id,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof topic.created_at === "string" && topic.created_at.length > 10,
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof topic.updated_at === "string" && topic.updated_at.length > 10,
  );
}
