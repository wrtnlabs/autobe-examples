import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFavorite";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

/**
 * Test the complete workflow of a member adding a discussion topic to their
 * favorites collection.
 *
 * This test validates the core bookmarking functionality that allows members to
 * save valuable economic and political discussions for later reference. The
 * workflow demonstrates proper authentication, topic creation, and favorite
 * management.
 *
 * Workflow steps:
 *
 * 1. Register administrator and create a discussion category
 * 2. Register a member account and authenticate
 * 3. Create a discussion topic in the category
 * 4. Add the topic to the member's favorites
 * 5. Validate the favorite record with all required metadata
 */
export async function test_api_favorite_creation_by_authenticated_member(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account
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

  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a discussion category as administrator
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const categorySlug = RandomGenerator.alphaNumeric(12);

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
          parent_category_id: null,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Register member account
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

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a discussion topic as the authenticated member
  const topicTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const topicBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 10,
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

  // Step 5: Add the topic to the member's favorites
  const favorite =
    await api.functional.discussionBoard.member.users.favorites.create(
      connection,
      {
        userId: member.id,
        body: {
          discussion_board_topic_id: topic.id,
        } satisfies IDiscussionBoardFavorite.ICreate,
      },
    );
  typia.assert(favorite);

  // Step 6: Validate the favorite record - business logic only
  TestValidator.equals(
    "favorite has correct topic ID",
    favorite.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "favorite topic summary has correct ID",
    favorite.topic.id,
    topic.id,
  );
  TestValidator.equals(
    "favorite topic summary has correct title",
    favorite.topic.title,
    topic.title,
  );
}
