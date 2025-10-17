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
 * Test the complete topic creation workflow by an authenticated member.
 *
 * This test validates the end-to-end process of a member creating a discussion
 * topic on the economic and political discussion board platform. It
 * demonstrates a realistic business scenario where an administrator first sets
 * up the category infrastructure, then a member joins and creates a topic
 * within that category.
 *
 * Workflow steps:
 *
 * 1. Administrator joins the platform to gain category creation privileges
 * 2. Administrator creates a category for topic organization
 * 3. Member joins the platform to obtain authentication credentials
 * 4. Member creates a discussion topic with required fields and category
 *    assignment
 * 5. Verify all topic properties, metadata, and relationships are correctly
 *    established
 */
export async function test_api_topic_creation_by_authenticated_member(
  connection: api.IConnection,
) {
  // Step 1: Administrator joins to create category infrastructure
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const adminPassword = "AdminPass123!@#";

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Administrator creates a category for mandatory topic categorization
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals("category name matches", category.name, categoryName);
  TestValidator.equals("category is active", category.is_active, true);

  // Step 3: Member joins the platform to gain topic creation privileges
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = "MemberPass123!@#";
  const memberDisplayName = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a discussion topic with all required fields
  const topicTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const topicBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topicTitle,
        body: topicBody,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Step 5: Verify topic properties and relationships
  TestValidator.equals("topic title matches", topic.title, topicTitle);
  TestValidator.equals("topic body matches", topic.body, topicBody);
  TestValidator.equals(
    "topic category id matches",
    topic.category.id,
    category.id,
  );
  TestValidator.equals(
    "topic category name matches",
    topic.category.name,
    categoryName,
  );
  TestValidator.equals("topic author id matches", topic.author.id, member.id);
  TestValidator.equals(
    "topic author username matches",
    topic.author.username,
    memberUsername,
  );
  TestValidator.equals("topic status is active", topic.status, "active");
  TestValidator.equals("topic view count initialized", topic.view_count, 0);
  TestValidator.equals("topic reply count initialized", topic.reply_count, 0);
  TestValidator.equals("topic is not pinned", topic.is_pinned, false);
}
