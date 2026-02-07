import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test moderation action types analytics endpoint with filters that should return empty results.
 * Validates proper handling of no-matching scenarios including:
 * - Searching for non-existent text
 * - Filtering by non-matching category/severity combinations
 * - Using filters that exclude all existing records
 * Verifies empty data arrays with appropriate pagination metadata.
 */
export async function test_api_moderation_action_types_analytics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Search for non-existent text that should return empty results
  const searchResult =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_text_that_will_not_match_anything",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate empty results for non-existent search
  TestValidator.equals(
    "empty data array for non-existent search",
    searchResult.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-existent search",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent search",
    searchResult.pagination.pages,
    0,
  );
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.equals(
    "limit is maintained",
    searchResult.pagination.limit,
    10,
  );
  // Test 2: Filter by non-matching category and severity combination
  const categorySeverityResult =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          category: "non_existent_category",
          severity_level: "non_existent_severity",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(categorySeverityResult);
  // Validate empty results for non-matching filters
  TestValidator.equals(
    "empty data array for non-matching category/severity",
    categorySeverityResult.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-matching category/severity",
    categorySeverityResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-matching category/severity",
    categorySeverityResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    categorySeverityResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is maintained",
    categorySeverityResult.pagination.limit,
    5,
  );
  // Test 3: Combination of multiple filters that should exclude all records
  const combinationResult =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          search: "impossible_search_term",
          category: "impossible_category",
          severity_level: "impossible_severity",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(combinationResult);
  // Validate empty results for combination of exclusionary filters
  TestValidator.equals(
    "empty data array for combination filters",
    combinationResult.data,
    [],
  );
  TestValidator.equals(
    "zero records for combination filters",
    combinationResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for combination filters",
    combinationResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    combinationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is maintained",
    combinationResult.pagination.limit,
    15,
  );
  // Test 4: High page number with empty results
  const highPageResult =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          search: "guaranteed_no_match",
          page: 100,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(highPageResult);
  // Validate pagination behavior with high page number and empty results
  TestValidator.equals(
    "empty data array for high page",
    highPageResult.data,
    [],
  );
  TestValidator.equals(
    "zero records for high page",
    highPageResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for high page",
    highPageResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 100",
    highPageResult.pagination.current,
    100,
  );
  TestValidator.equals(
    "limit is maintained",
    highPageResult.pagination.limit,
    10,
  );
}
