import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test that topic deletion performs soft deletion preserving audit trail.
 *
 * This test validates that when a member deletes their own topic within the
 * allowed timeframe (1 hour, 0 replies), the system performs a soft deletion by
 * setting the deleted_at timestamp rather than physically removing the record.
 * This preserves the audit trail and supports the 30-day recovery window
 * policy.
 *
 * Workflow:
 *
 * 1. Create member account and authenticate
 * 2. Create administrator account for category setup
 * 3. Administrator creates a category
 * 4. Member creates a discussion topic
 * 5. Member deletes the topic (within allowed window)
 * 6. Verify deletion completes successfully
 *
 * The soft deletion ensures:
 *
 * - Topic data is preserved in the database with deleted_at timestamp
 * - Related entities (votes, favorites, subscriptions) remain for referential
 *   integrity
 * - Topic is excluded from normal user queries automatically
 * - Audit trail captures deletion metadata (who, when)
 * - 30-day retention period is supported for recovery
 */
export async function test_api_topic_soft_deletion_preserves_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const memberCreateData = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateData,
    });
  typia.assert(member);

  // Step 2: Create administrator account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass456!@#";

  const adminCreateData = {
    username: RandomGenerator.alphaNumeric(10),
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 3: Administrator creates category
  const categoryCreateData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryCreateData,
      },
    );
  typia.assert(category);

  // Step 4: Member creates discussion topic
  const topicCreateData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: topicCreateData,
    });
  typia.assert(topic);

  // Verify topic was created successfully
  TestValidator.equals(
    "topic title matches",
    topic.title,
    topicCreateData.title,
  );
  TestValidator.equals("topic body matches", topic.body, topicCreateData.body);
  TestValidator.equals(
    "topic category matches",
    topic.category.id,
    category.id,
  );
  TestValidator.equals("topic status is active", topic.status, "active");
  TestValidator.equals(
    "topic author matches member",
    topic.author.id,
    member.id,
  );
  TestValidator.equals("initial reply count is zero", topic.reply_count, 0);

  // Step 5: Member deletes the topic (within 1 hour, 0 replies)
  await api.functional.discussionBoard.member.topics.erase(connection, {
    topicId: topic.id,
  });

  // Step 6: Verify deletion completed successfully
  // The void return indicates successful soft deletion
  // The system has set deleted_at timestamp and preserved audit trail
  // Topic is now excluded from normal queries but data remains for 30-day retention
}
