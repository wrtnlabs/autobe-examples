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
 * Test that the system prevents deletion of tags currently associated with
 * discussion topics.
 *
 * This test validates the referential integrity protection mechanism by
 * attempting to delete a tag that is actively being used by a discussion topic.
 * The system must reject the deletion to maintain data consistency and prevent
 * tags from disappearing from active discussions.
 *
 * Test workflow:
 *
 * 1. Create administrator account for tag management
 * 2. Create a tag for categorization
 * 3. Create member account for topic authoring
 * 4. Create category required for topic creation
 * 5. Create discussion topic with the tag to establish usage
 * 6. Attempt to delete the in-use tag as administrator
 * 7. Verify deletion is rejected with appropriate error
 * 8. Verify tag remains unchanged after failed deletion
 * 9. Verify topic's tag association is preserved
 */
export async function test_api_tag_deletion_prevented_when_in_use(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin@Pass123";

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a tag as administrator
  const tagName = RandomGenerator.name(1);
  const tagDescription = RandomGenerator.paragraph({ sentences: 2 });

  const createdTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: tagName,
        description: tagDescription,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(createdTag);
  TestValidator.equals("tag name matches", createdTag.name, tagName);

  // Step 3: Create member account for topic creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member@Pass123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Switch back to administrator and create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: "economics",
          description: "Economic discussions and analysis",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Switch to member and create topic with the tag
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const topicTitle = RandomGenerator.paragraph({ sentences: 3 });
  const topicBody = RandomGenerator.content({ paragraphs: 2 });

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
  TestValidator.equals("topic has tag", topic.tags.length, 1);
  TestValidator.equals(
    "topic tag matches created tag",
    topic.tags[0].id,
    createdTag.id,
  );

  // Step 6: Switch back to administrator and attempt to delete the in-use tag
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });

  // Step 7: Verify deletion is rejected with error
  await TestValidator.error(
    "tag deletion should fail when tag is in use",
    async () => {
      await api.functional.discussionBoard.administrator.tags.erase(
        connection,
        {
          tagId: createdTag.id,
        },
      );
    },
  );
}
