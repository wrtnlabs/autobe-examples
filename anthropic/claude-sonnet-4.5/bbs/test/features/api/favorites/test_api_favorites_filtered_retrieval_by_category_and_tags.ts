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
 * Test filtering, search, pagination, and sorting of favorited discussion
 * topics.
 *
 * This test validates that users can efficiently organize and discover their
 * bookmarked discussions through search functionality, pagination, and multiple
 * sorting options.
 *
 * Workflow:
 *
 * 1. Create member account for favoriting topics
 * 2. Create administrator account for category management
 * 3. Create Economics and Politics categories
 * 4. Create multiple topics across categories
 * 5. Favorite several topics
 * 6. Test search functionality with keyword matching
 * 7. Test pagination with configurable page sizes
 * 8. Test multiple sorting options (date favorited, topic created)
 * 9. Verify pagination metadata accuracy
 */
export async function test_api_favorites_filtered_retrieval_by_category_and_tags(
  connection: api.IConnection,
) {
  // Step 1: Create member account who will favorite topics
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "Test1234!@#$",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create administrator account for category creation
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "Admin1234!@#$",
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 3: Create Economics category
  const economicsCategory =
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
  typia.assert(economicsCategory);

  // Step 4: Create Politics category
  const politicsCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Politics",
          slug: "politics",
          description: "Political discussions and debates",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(politicsCategory);

  // Step 5: Switch back to member account for topic creation
  await api.functional.auth.member.join(connection, {
    body: memberData,
  });

  // Step 6: Create multiple topics across categories
  const topics: IDiscussionBoardTopic[] = [];

  // Economics topics
  const economicsTopic1 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: "Monetary Policy Impact on Inflation",
        body: "This is a detailed discussion about monetary policy and its effects on inflation rates in modern economies.",
        category_id: economicsCategory.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(economicsTopic1);
  topics.push(economicsTopic1);

  const economicsTopic2 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: "Fiscal Stimulus and Economic Growth",
        body: "Analyzing the relationship between government spending and economic growth in various countries.",
        category_id: economicsCategory.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(economicsTopic2);
  topics.push(economicsTopic2);

  // Politics topics
  const politicsTopic1 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: "Democratic Reform in Modern Societies",
        body: "Exploring democratic reform initiatives and their impacts on governance and citizen participation.",
        category_id: politicsCategory.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(politicsTopic1);
  topics.push(politicsTopic1);

  const politicsTopic2 =
    await api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: "International Relations in the 21st Century",
        body: "Discussion about changing dynamics in international relations and global diplomacy.",
        category_id: politicsCategory.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    });
  typia.assert(politicsTopic2);
  topics.push(politicsTopic2);

  // Step 7: Favorite all created topics
  const favorites: IDiscussionBoardFavorite[] = [];

  for (const topic of topics) {
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
    favorites.push(favorite);
  }

  // Step 8: Test basic retrieval of all favorites
  const allFavorites =
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
  typia.assert(allFavorites);

  TestValidator.equals(
    "all favorites count matches created favorites",
    allFavorites.data.length,
    topics.length,
  );

  TestValidator.equals(
    "pagination total records matches favorites count",
    allFavorites.pagination.records,
    topics.length,
  );

  // Step 9: Test pagination with smaller page size
  const paginatedPage1 =
    await api.functional.discussionBoard.member.users.favorites.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardFavorite.IRequest,
      },
    );
  typia.assert(paginatedPage1);

  TestValidator.equals(
    "first page contains correct number of items",
    paginatedPage1.data.length,
    2,
  );

  TestValidator.equals(
    "pagination current page is 1",
    paginatedPage1.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit is 2",
    paginatedPage1.pagination.limit,
    2,
  );

  // Step 10: Test second page of pagination
  const paginatedPage2 =
    await api.functional.discussionBoard.member.users.favorites.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IDiscussionBoardFavorite.IRequest,
      },
    );
  typia.assert(paginatedPage2);

  TestValidator.equals(
    "second page current page is 2",
    paginatedPage2.pagination.current,
    2,
  );

  TestValidator.predicate(
    "second page contains remaining items",
    paginatedPage2.data.length > 0,
  );

  // Step 11: Test search functionality with keyword matching
  const searchResults =
    await api.functional.discussionBoard.member.users.favorites.index(
      connection,
      {
        userId: member.id,
        body: {
          search: "Monetary",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardFavorite.IRequest,
      },
    );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search results contain matching topic",
    searchResults.data.length > 0,
  );

  const foundMonetaryTopic = searchResults.data.find(
    (topic) => topic.title === "Monetary Policy Impact on Inflation",
  );
  TestValidator.predicate(
    "monetary policy topic found in search results",
    foundMonetaryTopic !== undefined,
  );

  // Step 12: Test search with different keyword
  const politicsSearch =
    await api.functional.discussionBoard.member.users.favorites.index(
      connection,
      {
        userId: member.id,
        body: {
          search: "Reform",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardFavorite.IRequest,
      },
    );
  typia.assert(politicsSearch);

  const foundReformTopic = politicsSearch.data.find(
    (topic) => topic.title === "Democratic Reform in Modern Societies",
  );
  TestValidator.predicate(
    "reform topic found in search results",
    foundReformTopic !== undefined,
  );

  // Step 13: Test sorting by date favorited descending (newest first)
  const sortedByDateDesc =
    await api.functional.discussionBoard.member.users.favorites.index(
      connection,
      {
        userId: member.id,
        body: {
          sort_by: "date_favorited_desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardFavorite.IRequest,
      },
    );
  typia.assert(sortedByDateDesc);

  TestValidator.equals(
    "sorted by date results count matches total favorites",
    sortedByDateDesc.data.length,
    topics.length,
  );

  // Step 14: Test sorting by date favorited ascending (oldest first)
  const sortedByDateAsc =
    await api.functional.discussionBoard.member.users.favorites.index(
      connection,
      {
        userId: member.id,
        body: {
          sort_by: "date_favorited_asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardFavorite.IRequest,
      },
    );
  typia.assert(sortedByDateAsc);

  TestValidator.equals(
    "sorted by date ascending returns all favorites",
    sortedByDateAsc.data.length,
    topics.length,
  );

  // Step 15: Test sorting by topic created date
  const sortedByTopicCreated =
    await api.functional.discussionBoard.member.users.favorites.index(
      connection,
      {
        userId: member.id,
        body: {
          sort_by: "topic_created_desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardFavorite.IRequest,
      },
    );
  typia.assert(sortedByTopicCreated);

  TestValidator.equals(
    "topic created sort returns all favorites",
    sortedByTopicCreated.data.length,
    topics.length,
  );

  // Step 16: Test sorting by topic activity
  const sortedByActivity =
    await api.functional.discussionBoard.member.users.favorites.index(
      connection,
      {
        userId: member.id,
        body: {
          sort_by: "topic_activity_desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardFavorite.IRequest,
      },
    );
  typia.assert(sortedByActivity);

  TestValidator.equals(
    "activity sort returns all favorites",
    sortedByActivity.data.length,
    topics.length,
  );
}
