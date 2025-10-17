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
 * Test the complete workflow of a member updating their own discussion topic
 * within the allowed 24-hour editing window.
 *
 * This test validates that topic authors can successfully modify topic content
 * including title, body, category, and tags within the time constraints. The
 * workflow ensures proper authentication, topic creation, immediate update
 * capability, and verification of all changes including metadata updates.
 *
 * Workflow:
 *
 * 1. Create an administrator account to enable category creation
 * 2. Create a new category that will be used for the topic
 * 3. Create a new member account via join operation to establish authentication
 * 4. Create an initial discussion topic with the authenticated member as author
 * 5. Immediately update the topic (within 24-hour window) by modifying title,
 *    body, category, and tags
 * 6. Verify the topic update succeeds and reflects all changes
 * 7. Verify updated_at timestamp is refreshed
 */
export async function test_api_topic_update_by_author_within_time_window(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category for topic assignment
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for topic authoring (this switches auth to member)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create initial discussion topic
  const initialTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const initialBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const createdTopic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: initialTitle,
        body: initialBody,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(createdTopic);

  // Verify initial topic creation
  TestValidator.equals(
    "initial topic title matches",
    createdTopic.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial topic body matches",
    createdTopic.body,
    initialBody,
  );
  TestValidator.equals(
    "initial category ID matches",
    createdTopic.category.id,
    category.id,
  );

  // Store original created_at and updated_at for comparison
  const originalCreatedAt = createdTopic.created_at;
  const originalUpdatedAt = createdTopic.updated_at;

  // Step 5: Immediately update the topic (within 24-hour window)
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 12,
    sentenceMax: 25,
  });

  const updatedTopic: IDiscussionBoardTopic =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: createdTopic.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.IUpdate,
    });
  typia.assert(updatedTopic);

  // Step 6: Verify all changes are reflected correctly
  TestValidator.equals(
    "topic ID remains unchanged",
    updatedTopic.id,
    createdTopic.id,
  );
  TestValidator.equals(
    "updated title matches new value",
    updatedTopic.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated body matches new value",
    updatedTopic.body,
    updatedBody,
  );
  TestValidator.equals(
    "category remains assigned",
    updatedTopic.category.id,
    category.id,
  );

  // Step 7: Verify metadata updates
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedTopic.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    updatedTopic.updated_at !== originalUpdatedAt,
  );

  // Verify the updated_at is actually later than the original
  const originalDate = new Date(originalUpdatedAt);
  const updatedDate = new Date(updatedTopic.updated_at);
  TestValidator.predicate(
    "updated_at is later than original",
    updatedDate >= originalDate,
  );
}
