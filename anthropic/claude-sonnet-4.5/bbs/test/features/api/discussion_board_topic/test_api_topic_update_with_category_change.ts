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
 * Test topic category reassignment workflow.
 *
 * This test validates the complete workflow of updating a discussion topic's
 * category assignment, ensuring topics can be recategorized to better organize
 * discussions as their content evolves.
 *
 * Workflow steps:
 *
 * 1. Create a new member account for authentication
 * 2. Create an administrator account for category management
 * 3. Create two different categories (original and target)
 * 4. Create a topic assigned to the first category
 * 5. Update the topic to reassign it to the second category
 * 6. Verify the category change is successfully applied
 * 7. Verify the topic is properly associated with the new category
 *
 * Validation points:
 *
 * - Topic category can be changed during update
 * - Category reference must point to a valid, active category
 * - Topic is properly associated with the new category
 * - Update operation validates category existence
 */
export async function test_api_topic_update_with_category_change(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(15),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an administrator account for category management
  const adminData = {
    username: RandomGenerator.alphaNumeric(15),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 3: Create two different categories
  const firstCategoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({ paragraphs: 1 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const firstCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: firstCategoryData,
      },
    );
  typia.assert(firstCategory);

  const secondCategoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.content({ paragraphs: 1 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const secondCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: secondCategoryData,
      },
    );
  typia.assert(secondCategory);

  // Switch back to member authentication for topic creation
  await api.functional.auth.member.join(connection, {
    body: memberData,
  });

  // Step 4: Create a topic assigned to the first category
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: firstCategory.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicData,
    },
  );
  typia.assert(topic);

  // Verify topic is initially assigned to the first category
  TestValidator.equals(
    "topic initially assigned to first category",
    topic.category.id,
    firstCategory.id,
  );

  // Step 5: Update the topic to reassign it to the second category
  const updateData = {
    category_id: secondCategory.id,
  } satisfies IDiscussionBoardTopic.IUpdate;

  const updatedTopic =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: updateData,
    });
  typia.assert(updatedTopic);

  // Step 6 & 7: Verify the category change is successfully applied
  TestValidator.equals(
    "topic category updated to second category",
    updatedTopic.category.id,
    secondCategory.id,
  );

  TestValidator.notEquals(
    "topic category changed from first category",
    updatedTopic.category.id,
    firstCategory.id,
  );

  TestValidator.equals(
    "updated topic category name matches second category",
    updatedTopic.category.name,
    secondCategory.name,
  );

  TestValidator.equals(
    "updated topic category slug matches second category",
    updatedTopic.category.slug,
    secondCategory.slug,
  );

  // Verify other topic properties remain unchanged
  TestValidator.equals("topic ID remains unchanged", updatedTopic.id, topic.id);

  TestValidator.equals(
    "topic title remains unchanged",
    updatedTopic.title,
    topic.title,
  );

  TestValidator.equals(
    "topic body remains unchanged",
    updatedTopic.body,
    topic.body,
  );
}
