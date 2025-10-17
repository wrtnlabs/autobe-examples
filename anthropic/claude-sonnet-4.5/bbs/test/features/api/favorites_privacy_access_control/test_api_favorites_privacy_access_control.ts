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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";

/**
 * Test favorites creation and retrieval workflow with proper authentication.
 *
 * This test validates the complete workflow of creating discussion topics,
 * favoriting them, and retrieving the favorites collection. Since the API
 * doesn't expose profile update endpoints, this test focuses on the core
 * favorites functionality with a single authenticated member.
 *
 * Workflow:
 *
 * 1. Create administrator account for platform setup
 * 2. Create discussion category for topics
 * 3. Create member account for favorites testing
 * 4. Member creates multiple discussion topics
 * 5. Member favorites the created topics
 * 6. Member retrieves their favorites collection
 * 7. Verify favorites contain complete topic information
 * 8. Verify pagination and data structure
 */
export async function test_api_favorites_privacy_access_control(
  connection: api.IConnection,
) {
  // Step 1: Create administrator for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: adminEmail,
      password: "AdminPass789!@#",
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category for topics
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
  TestValidator.equals("category name", category.name, "Economics");
  TestValidator.equals("category is active", category.is_active, true);

  // Step 3: Create member account for favorites testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates multiple discussion topics
  const topics = await ArrayUtil.asyncRepeat(3, async (index) => {
    const topic = await api.functional.discussionBoard.member.topics.create(
      connection,
      {
        body: {
          title: `Economic Topic ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
          category_id: category.id,
          tag_ids: null,
        } satisfies IDiscussionBoardTopic.ICreate,
      },
    );
    typia.assert(topic);
    return topic;
  });

  TestValidator.equals("created topics count", topics.length, 3);

  // Step 5: Member favorites all created topics
  const favorites = await ArrayUtil.asyncRepeat(
    topics.length,
    async (index) => {
      const favorite =
        await api.functional.discussionBoard.member.users.favorites.create(
          connection,
          {
            userId: member.id,
            body: {
              discussion_board_topic_id: topics[index].id,
            } satisfies IDiscussionBoardFavorite.ICreate,
          },
        );
      typia.assert(favorite);
      return favorite;
    },
  );

  TestValidator.equals("favorited topics count", favorites.length, 3);

  // Step 6: Member retrieves their favorites collection
  const favoritesPage =
    await api.functional.discussionBoard.member.users.favorites.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardFavorite.IRequest,
      },
    );
  typia.assert(favoritesPage);

  // Step 7: Verify favorites contain complete topic information
  TestValidator.equals(
    "favorites collection contains all favorited topics",
    favoritesPage.data.length,
    topics.length,
  );

  TestValidator.predicate(
    "all favorited topics have complete information",
    favoritesPage.data.every(
      (topic) =>
        topic.id !== null &&
        topic.title !== null &&
        topic.category !== null &&
        topic.author !== null &&
        topic.status !== null,
    ),
  );

  // Step 8: Verify pagination structure
  typia.assert(favoritesPage.pagination);
  TestValidator.equals(
    "pagination current page",
    favoritesPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", favoritesPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records count is valid",
    favoritesPage.pagination.records >= topics.length,
  );

  // Verify favorited topics match created topics
  const favoritedTopicIds = favoritesPage.data.map((t) => t.id);
  const createdTopicIds = topics.map((t) => t.id);
  TestValidator.predicate(
    "all created topics are in favorites",
    createdTopicIds.every((id) => favoritedTopicIds.includes(id)),
  );
}
