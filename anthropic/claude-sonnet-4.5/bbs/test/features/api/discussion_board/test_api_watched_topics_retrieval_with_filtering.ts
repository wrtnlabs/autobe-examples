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
import type { IDiscussionBoardWatchedTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWatchedTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardWatchedTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWatchedTopic";

/**
 * Test comprehensive retrieval of watched topics with advanced filtering,
 * pagination, and sorting capabilities.
 *
 * This test validates the watched topic management system that enables users to
 * track discussions they're interested in. It creates a complete test
 * environment with member account, admin account, categories, and multiple
 * topics, then watches several topics and retrieves them with various filtering
 * options.
 *
 * Test steps:
 *
 * 1. Register a new member account to create authenticated user context
 * 2. Register a new administrator account to create admin privileges for category
 *    creation
 * 3. Create a discussion category required for topic creation
 * 4. Create multiple discussion topics (3-5 topics) to provide sufficient test
 *    data
 * 5. Watch several of the created topics by calling the watch endpoint for each
 *    topic
 * 6. Execute PATCH operation to retrieve watched topics list with various filter
 *    combinations
 * 7. Validate response includes accurate pagination metadata, correct topic
 *    details, unread indicators, and proper filtering results
 */
export async function test_api_watched_topics_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  TestValidator.equals("member account created", typeof member.id, "string");

  const memberConnectionState = { ...connection };

  // Step 2: Register administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!@#",
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 3: Create discussion category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Restore member context for topic creation
  connection.headers = memberConnectionState.headers;

  // Step 4: Create multiple discussion topics (3-5)
  const topicCount = Math.floor(Math.random() * 3) + 3;
  const topics = await ArrayUtil.asyncRepeat(topicCount, async (index) => {
    const topicData = {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
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
    return topic;
  });

  TestValidator.equals("created topics count", topics.length, topicCount);

  // Step 5: Watch several of the created topics
  const topicsToWatch = RandomGenerator.sample(
    topics,
    Math.min(3, topics.length),
  );
  const watchedTopics = await ArrayUtil.asyncMap(
    topicsToWatch,
    async (topic) => {
      const watchData = {
        discussion_board_topic_id: topic.id,
      } satisfies IDiscussionBoardWatchedTopic.ICreate;

      const watched =
        await api.functional.discussionBoard.member.users.watchedTopics.create(
          connection,
          {
            userId: member.id,
            body: watchData,
          },
        );
      typia.assert(watched);
      return watched;
    },
  );

  TestValidator.equals(
    "watched topics count",
    watchedTopics.length,
    topicsToWatch.length,
  );

  // Step 6: Execute PATCH operation to retrieve watched topics with various filters

  // Test 1: Retrieve all watched topics with basic pagination
  const allWatchedRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardWatchedTopic.IRequest;

  const allWatchedResult =
    await api.functional.discussionBoard.member.users.watchedTopics.index(
      connection,
      {
        userId: member.id,
        body: allWatchedRequest,
      },
    );
  typia.assert(allWatchedResult);

  // Step 7: Validate response structure and data
  TestValidator.equals(
    "pagination current page",
    allWatchedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    allWatchedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records matches watched count",
    allWatchedResult.pagination.records >= watchedTopics.length,
  );
  TestValidator.predicate(
    "data array not empty",
    allWatchedResult.data.length > 0,
  );

  // Validate topic details in response
  const firstWatchedTopic = allWatchedResult.data[0];
  typia.assert(firstWatchedTopic);
  TestValidator.predicate(
    "topic has valid id",
    typeof firstWatchedTopic.id === "string",
  );
  TestValidator.predicate(
    "topic has title",
    typeof firstWatchedTopic.topic_title === "string",
  );
  TestValidator.predicate(
    "topic has category",
    typeof firstWatchedTopic.topic_category === "string",
  );
  TestValidator.predicate(
    "topic has reply count",
    typeof firstWatchedTopic.topic_reply_count === "number",
  );
  TestValidator.predicate(
    "topic has unread activity flag",
    typeof firstWatchedTopic.has_unread_activity === "boolean",
  );

  // Validate unread indicator calculation
  for (const watchedTopic of allWatchedResult.data) {
    if (
      watchedTopic.last_read_at !== null &&
      watchedTopic.last_read_at !== undefined
    ) {
      const lastReadTime = new Date(watchedTopic.last_read_at).getTime();
      const topicUpdatedTime = new Date(
        watchedTopic.topic_updated_at,
      ).getTime();
      const expectedUnread = topicUpdatedTime > lastReadTime;
      TestValidator.equals(
        "unread indicator matches activity vs last_read_at",
        watchedTopic.has_unread_activity,
        expectedUnread,
      );
    }
  }

  // Test 2: Filter by category
  const categoryFilterRequest = {
    category_filter: category.name,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardWatchedTopic.IRequest;

  const categoryFilteredResult =
    await api.functional.discussionBoard.member.users.watchedTopics.index(
      connection,
      {
        userId: member.id,
        body: categoryFilterRequest,
      },
    );
  typia.assert(categoryFilteredResult);
  TestValidator.predicate(
    "category filter returns results",
    categoryFilteredResult.data.length > 0,
  );

  // Validate all returned topics match the category filter
  for (const watchedTopic of categoryFilteredResult.data) {
    TestValidator.equals(
      "filtered topic has correct category",
      watchedTopic.topic_category,
      category.name,
    );
  }

  // Test 3: Sort by created_at and validate sort order
  const sortedRequest = {
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardWatchedTopic.IRequest;

  const sortedResult =
    await api.functional.discussionBoard.member.users.watchedTopics.index(
      connection,
      {
        userId: member.id,
        body: sortedRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted results returned",
    sortedResult.data.length > 0,
  );

  // Validate descending sort order
  if (sortedResult.data.length > 1) {
    for (let i = 0; i < sortedResult.data.length - 1; i++) {
      const currentTime = new Date(sortedResult.data[i].created_at).getTime();
      const nextTime = new Date(sortedResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "descending sort order maintained",
        currentTime >= nextTime,
      );
    }
  }

  // Test 4: Date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    watched_after: oneDayAgo.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardWatchedTopic.IRequest;

  const dateRangeResult =
    await api.functional.discussionBoard.member.users.watchedTopics.index(
      connection,
      {
        userId: member.id,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResult);

  // Validate all returned topics were watched after the specified date
  for (const watchedTopic of dateRangeResult.data) {
    const watchedTime = new Date(watchedTopic.created_at).getTime();
    TestValidator.predicate(
      "watched topic is after specified date",
      watchedTime >= oneDayAgo.getTime(),
    );
  }

  // Test 5: Search within watched topic titles
  if (allWatchedResult.data.length > 0) {
    const sampleTopic = allWatchedResult.data[0];
    const searchTerm = RandomGenerator.substring(sampleTopic.topic_title);

    const searchRequest = {
      topic_title_search: searchTerm,
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardWatchedTopic.IRequest;

    const searchResult =
      await api.functional.discussionBoard.member.users.watchedTopics.index(
        connection,
        {
          userId: member.id,
          body: searchRequest,
        },
      );
    typia.assert(searchResult);
  }

  // Test 6: Pagination functionality
  const paginationRequest = {
    page: 1,
    limit: 2,
  } satisfies IDiscussionBoardWatchedTopic.IRequest;

  const paginatedResult =
    await api.functional.discussionBoard.member.users.watchedTopics.index(
      connection,
      {
        userId: member.id,
        body: paginationRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata calculated correctly",
    paginatedResult.pagination.pages ===
      Math.ceil(paginatedResult.pagination.records / 2),
  );
}
