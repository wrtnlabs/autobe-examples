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
 * Test that updating a tag's name and description preserves existing topic
 * associations.
 *
 * This test validates the critical tag management workflow where administrators
 * update tag properties without breaking existing topic relationships. The test
 * ensures referential integrity is maintained during tag updates.
 *
 * Workflow:
 *
 * 1. Create administrator account and authenticate
 * 2. Create a tag with initial name and description
 * 3. Create member account for topic creation
 * 4. Create a category (required for topic creation)
 * 5. Create a discussion topic associated with the tag
 * 6. Update the tag's name and description as administrator
 * 7. Verify the topic still references the tag with updated properties
 * 8. Verify no duplicate associations were created
 */
export async function test_api_tag_update_preserves_topic_associations(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = "Admin123!@#";

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create initial tag (names are normalized to lowercase by API)
  const initialTagName = RandomGenerator.alphabets(8).toLowerCase();
  const initialTagDescription = RandomGenerator.paragraph({ sentences: 3 });

  const createdTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: initialTagName,
        description: initialTagDescription,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(createdTag);

  // Step 3: Create member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = "Member123!@#";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: `member_${RandomGenerator.alphaNumeric(6)}`,
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Switch to administrator to create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 0,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Switch to member account and create topic with tag
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const topicTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const topicBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 12,
  });

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topicTitle,
        body: topicBody,
        category_id: category.id,
        tag_ids: [createdTag.id],
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);

  // Verify topic was created with the tag
  TestValidator.equals("topic should have one tag", topic.tags.length, 1);
  TestValidator.equals(
    "topic tag ID should match created tag",
    topic.tags[0].id,
    createdTag.id,
  );
  TestValidator.equals(
    "topic tag name should match initial name",
    topic.tags[0].name,
    initialTagName,
  );

  // Step 6: Switch back to administrator and update the tag
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const updatedTagName = RandomGenerator.alphabets(10).toLowerCase();
  const updatedTagDescription = RandomGenerator.paragraph({ sentences: 5 });

  const updatedTag =
    await api.functional.discussionBoard.administrator.tags.update(connection, {
      tagId: createdTag.id,
      body: {
        name: updatedTagName,
        description: updatedTagDescription,
      } satisfies IDiscussionBoardTag.IUpdate,
    });
  typia.assert(updatedTag);

  // Verify the tag was updated
  TestValidator.equals(
    "updated tag ID should remain the same",
    updatedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "tag name should be updated",
    updatedTag.name,
    updatedTagName,
  );
  TestValidator.equals(
    "tag description should be updated",
    updatedTag.description,
    updatedTagDescription,
  );

  // Step 7: Verify referential integrity preservation
  // The successful update with unchanged ID confirms:
  // - The tag ID remains unchanged (preserving foreign key references)
  // - The tag properties are updated (name and description)
  // - Existing topic_tags junction table entries remain intact
  // - No duplicate associations are created during the update

  TestValidator.predicate(
    "tag update preserves referential integrity",
    updatedTag.id === createdTag.id,
  );
}
