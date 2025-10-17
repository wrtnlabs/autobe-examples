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
 * Validates member can delete their own topic within 1-hour window with zero
 * replies.
 *
 * This test confirms the business rule allowing authors to remove their
 * discussion topics if no community engagement has occurred and the topic is
 * still fresh. The deletion window ensures authors can quickly correct mistakes
 * or remove unwanted content before it gains traction.
 *
 * Workflow:
 *
 * 1. Create member account (topic author)
 * 2. Create administrator account (for category management)
 * 3. Administrator creates a category
 * 4. Member creates a discussion topic
 * 5. Member deletes the topic immediately (within 1-hour, 0 replies)
 * 6. Verify deletion succeeds
 */
export async function test_api_topic_deletion_by_author_within_one_hour_no_replies(
  connection: api.IConnection,
) {
  // Step 1: Create member account to serve as topic author
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(15);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert<IDiscussionBoardMember.IAuthorized>(member);

  // Step 2: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass456!@#";
  const adminUsername = RandomGenerator.alphaNumeric(15);

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert<IDiscussionBoardAdministrator.IAuthorized>(admin);

  // Step 3: Administrator creates a category for topic assignment
  const categoryName = RandomGenerator.name(2);
  const categorySlug = RandomGenerator.alphabets(12);

  const category =
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
  typia.assert<IDiscussionBoardCategory>(category);

  // Step 4: Member creates a discussion topic
  const topicTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const topicBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
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
  typia.assert<IDiscussionBoardTopic>(topic);

  // Step 5: Member deletes the topic immediately (within 1-hour window, 0 replies)
  await api.functional.discussionBoard.member.topics.erase(connection, {
    topicId: topic.id,
  });

  // Step 6: Verify deletion succeeds - no error thrown indicates success
  // The soft deletion sets deleted_at timestamp, making topic hidden from normal queries
}
