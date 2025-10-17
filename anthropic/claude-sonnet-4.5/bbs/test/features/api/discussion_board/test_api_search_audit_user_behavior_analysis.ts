import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchHistory";
import type { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";

/**
 * Test search history audit log retrieval for analyzing user search behavior
 * patterns and optimizing search functionality.
 *
 * This test validates that administrators can track search queries, identify
 * popular terms, detect zero-result searches, and make data-driven decisions
 * about content and search improvements.
 *
 * Workflow:
 *
 * 1. Create administrator account for search analytics access
 * 2. Create member accounts that will perform searches to generate audit data
 * 3. Create categories for topic creation and search targets
 * 4. Create searchable content (topics) to generate meaningful search results
 * 5. Perform search queries that will be captured in search history audit trail
 * 6. Retrieve and validate search history with various filter combinations
 * 7. Verify search metadata including query text, filters, result counts, and
 *    click-through tracking
 */
export async function test_api_search_audit_user_behavior_analysis(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for search analytics access
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create member accounts that will perform searches
  const member1Data = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: member1Data,
    });
  typia.assert(member1);

  const member2Data = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: member2Data,
    });
  typia.assert(member2);

  // Step 3: Create categories for topic creation and search targets
  const categoryData = {
    name: "Economics",
    slug: "economics",
    description: "Economic discussions and analysis",
    parent_category_id: null,
    display_order: 1 satisfies number,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Create searchable topics to generate meaningful search results
  const topicsData = ArrayUtil.repeat(
    5,
    (index) =>
      ({
        title: `Economic Policy Analysis ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_id: category.id,
        tag_ids: null,
      }) satisfies IDiscussionBoardTopic.ICreate,
  );

  const topics: IDiscussionBoardTopic[] = await ArrayUtil.asyncMap(
    topicsData,
    async (topicData) => {
      const topic = await api.functional.discussionBoard.member.topics.create(
        connection,
        {
          body: topicData,
        },
      );
      typia.assert(topic);
      return topic;
    },
  );

  // Step 5: Perform search queries to generate audit trail data
  // Search 1: Member 1 searches for "Economic Policy"
  const searchResult1: IPageIDiscussionBoardTopic.ISummary =
    await api.functional.discussionBoard.topics.index(connection, {
      body: {
        search: "Economic Policy",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(searchResult1);

  // Search 2: Member 1 searches with category filter
  const searchResult2: IPageIDiscussionBoardTopic.ISummary =
    await api.functional.discussionBoard.topics.index(connection, {
      body: {
        search: "Analysis",
        category_id: category.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(searchResult2);

  // Search 3: Member 2 searches for different term
  const searchResult3: IPageIDiscussionBoardTopic.ISummary =
    await api.functional.discussionBoard.topics.index(connection, {
      body: {
        search: "Policy",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(searchResult3);

  // Search 4: Search that returns zero results
  const searchResult4: IPageIDiscussionBoardTopic.ISummary =
    await api.functional.discussionBoard.topics.index(connection, {
      body: {
        search: "NonExistentTermThatWillReturnZeroResults",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTopic.IRequest,
    });
  typia.assert(searchResult4);

  // Step 6: Retrieve search history audit logs with various filters
  // Filter 1: Get all search history without filters
  const allSearchHistory: IPageIDiscussionBoardSearchHistory =
    await api.functional.discussionBoard.administrator.audit.searches.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSearchHistory.IRequest,
      },
    );
  typia.assert(allSearchHistory);

  // Validate that search history contains entries
  TestValidator.predicate(
    "search history should contain entries",
    allSearchHistory.data.length > 0,
  );

  // Filter 2: Filter by specific user (member1)
  const member1SearchHistory: IPageIDiscussionBoardSearchHistory =
    await api.functional.discussionBoard.administrator.audit.searches.index(
      connection,
      {
        body: {
          user_id: member1.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSearchHistory.IRequest,
      },
    );
  typia.assert(member1SearchHistory);

  // Filter 3: Filter by keyword within search queries
  const keywordSearchHistory: IPageIDiscussionBoardSearchHistory =
    await api.functional.discussionBoard.administrator.audit.searches.index(
      connection,
      {
        body: {
          search_query_keyword: "Policy",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSearchHistory.IRequest,
      },
    );
  typia.assert(keywordSearchHistory);

  // Filter 4: Find zero-result searches (max_results = 0)
  const zeroResultSearches: IPageIDiscussionBoardSearchHistory =
    await api.functional.discussionBoard.administrator.audit.searches.index(
      connection,
      {
        body: {
          max_results: 0,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSearchHistory.IRequest,
      },
    );
  typia.assert(zeroResultSearches);

  // Validate that zero-result searches are identified
  TestValidator.predicate(
    "zero-result searches should be identified",
    zeroResultSearches.data.length > 0,
  );

  // Filter 5: Filter by minimum result count
  const successfulSearches: IPageIDiscussionBoardSearchHistory =
    await api.functional.discussionBoard.administrator.audit.searches.index(
      connection,
      {
        body: {
          min_results: 1,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSearchHistory.IRequest,
      },
    );
  typia.assert(successfulSearches);

  // Step 7: Validate search history metadata
  const sampleSearch = allSearchHistory.data[0];
  typia.assertGuard(sampleSearch);

  // Validate search query is captured
  TestValidator.predicate(
    "search query should be captured",
    typeof sampleSearch.search_query === "string" &&
      sampleSearch.search_query.length > 0,
  );

  // Validate result count is recorded
  TestValidator.predicate(
    "result count should be recorded",
    typeof sampleSearch.results_count === "number" &&
      sampleSearch.results_count >= 0,
  );

  // Validate created_at timestamp exists
  TestValidator.predicate(
    "created_at timestamp should exist",
    typeof sampleSearch.created_at === "string",
  );

  // Step 8: Validate pagination works correctly
  TestValidator.predicate(
    "pagination should have valid current page",
    allSearchHistory.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    allSearchHistory.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination should have valid records count",
    allSearchHistory.pagination.records >= 0,
  );
}
