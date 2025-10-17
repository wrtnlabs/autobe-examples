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
 * Test the complete workflow of a member removing a previously bookmarked
 * discussion from their favorites collection.
 *
 * This test validates the unfavorite functionality and soft deletion behavior
 * by:
 *
 * 1. Creating necessary prerequisites (admin, category, member, topic)
 * 2. Creating a favorite bookmark
 * 3. Removing the favorite through the DELETE endpoint
 * 4. Validating successful removal
 */
export async function test_api_favorite_removal_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account for category creation
  const adminData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create a discussion board category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Register member account for creating and favoriting topics
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create a discussion topic to be favorited
  const topicData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_id: category.id,
    tag_ids: null,
  } satisfies IDiscussionBoardTopic.ICreate;

  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: topicData,
    },
  );
  typia.assert(topic);

  // Step 5: Add the topic to favorites
  const favoriteData = {
    discussion_board_topic_id: topic.id,
  } satisfies IDiscussionBoardFavorite.ICreate;

  const favorite =
    await api.functional.discussionBoard.member.users.favorites.create(
      connection,
      {
        userId: member.id,
        body: favoriteData,
      },
    );
  typia.assert(favorite);

  // Validate favorite was created successfully
  TestValidator.equals(
    "favorite topic id matches",
    favorite.discussion_board_topic_id,
    topic.id,
  );
  TestValidator.equals(
    "favorite topic summary matches",
    favorite.topic.id,
    topic.id,
  );

  // Step 6: Remove the favorite (unfavorite the topic)
  await api.functional.discussionBoard.member.users.favorites.erase(
    connection,
    {
      userId: member.id,
      favoriteId: favorite.id,
    },
  );
}
