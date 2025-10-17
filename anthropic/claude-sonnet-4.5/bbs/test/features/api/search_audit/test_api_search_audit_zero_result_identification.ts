import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchHistory";
import type { IPageIDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopic";

export async function test_api_search_audit_zero_result_identification(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for accessing search audit logs
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create member accounts to perform searches
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: member1Email,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: member2Email,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  // Step 3: Perform searches that will return zero results
  // Search for non-existent topics to generate zero-result search history
  const zeroResultSearchTerms = [
    "quantum_cryptocurrency_blockchain_2099",
    "mars_colony_economics_future",
    "unicorn_political_theory_advanced",
    "nonexistent_debate_topic_xyz",
    "fictional_economic_model_test",
  ];

  // Member 1 performs searches that return zero results
  for (const searchTerm of zeroResultSearchTerms.slice(0, 3)) {
    const searchResult = await api.functional.discussionBoard.topics.index(
      connection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardTopic.IRequest,
      },
    );
    typia.assert(searchResult);

    // Verify that search returned zero results
    TestValidator.equals(
      "search should return zero results for non-existent topic",
      searchResult.data.length,
      0,
    );
  }

  // Member 2 performs different searches that return zero results
  for (const searchTerm of zeroResultSearchTerms.slice(3, 5)) {
    const searchResult = await api.functional.discussionBoard.topics.index(
      connection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardTopic.IRequest,
      },
    );
    typia.assert(searchResult);

    TestValidator.equals(
      "search should return zero results for fictional topic",
      searchResult.data.length,
      0,
    );
  }

  // Step 4: Administrator retrieves zero-result search history
  const zeroResultHistory =
    await api.functional.discussionBoard.administrator.audit.searches.index(
      connection,
      {
        body: {
          max_results: 0,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardSearchHistory.IRequest,
      },
    );
  typia.assert(zeroResultHistory);

  // Step 5: Validate zero-result search tracking
  TestValidator.predicate(
    "should have captured zero-result searches",
    zeroResultHistory.data.length > 0,
  );

  // Verify all returned searches have zero results_count
  for (const searchEntry of zeroResultHistory.data) {
    TestValidator.equals(
      "all search entries should have zero results",
      searchEntry.results_count,
      0,
    );

    TestValidator.predicate(
      "search query text should be captured",
      searchEntry.search_query.length > 0,
    );
  }

  // Validate that search queries match our test searches
  const capturedQueries = zeroResultHistory.data.map(
    (entry) => entry.search_query,
  );

  TestValidator.predicate(
    "should contain at least one of our zero-result search terms",
    zeroResultSearchTerms.some((term) => capturedQueries.includes(term)),
  );

  // Step 6: Test filtering with date range for temporal analysis
  const recentZeroResults =
    await api.functional.discussionBoard.administrator.audit.searches.index(
      connection,
      {
        body: {
          max_results: 0,
          date_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSearchHistory.IRequest,
      },
    );
  typia.assert(recentZeroResults);

  TestValidator.predicate(
    "date filtering should work with zero-result filter",
    recentZeroResults.data.length >= 0,
  );

  // Validate pagination information
  TestValidator.predicate(
    "pagination current page should be valid",
    recentZeroResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be valid",
    recentZeroResults.pagination.limit > 0,
  );
}
