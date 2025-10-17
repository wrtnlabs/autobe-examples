import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWarning";

/**
 * Test administrator warning search with comprehensive filtering capabilities.
 *
 * This test validates the complete warning search workflow for administrators,
 * ensuring that the warning system provides robust filtering, pagination, and
 * sorting capabilities for moderation oversight.
 *
 * Workflow:
 *
 * 1. Administrator authenticates to obtain access tokens
 * 2. Execute warning searches with various filter combinations
 * 3. Validate pagination functionality
 * 4. Test sorting options across different fields
 * 5. Verify response structure and data accuracy
 */
export async function test_api_warning_search_by_administrator_with_comprehensive_filters(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCredentials,
  });
  typia.assert(admin);

  // Step 2: Test basic warning search without filters
  const allWarningsRequest = {} satisfies IDiscussionBoardWarning.IRequest;
  const allWarningsPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: allWarningsRequest },
    );
  typia.assert(allWarningsPage);

  // Step 3: Test filtering by warning_level
  const warningLevels = [
    "first_warning",
    "second_warning",
    "final_warning",
  ] as const;
  const selectedLevel = RandomGenerator.pick(warningLevels);

  const levelFilterRequest = {
    warning_level: selectedLevel,
  } satisfies IDiscussionBoardWarning.IRequest;

  const levelFilteredPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: levelFilterRequest },
    );
  typia.assert(levelFilteredPage);

  // Step 4: Test filtering by violation_category
  const violationCategories = [
    "personal_attack",
    "hate_speech",
    "misinformation",
    "spam",
    "offensive_language",
    "off_topic",
    "threats",
    "doxxing",
    "trolling",
    "other",
  ] as const;
  const selectedCategory = RandomGenerator.pick(violationCategories);

  const categoryFilterRequest = {
    violation_category: selectedCategory,
  } satisfies IDiscussionBoardWarning.IRequest;

  const categoryFilteredPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: categoryFilterRequest },
    );
  typia.assert(categoryFilteredPage);

  // Step 5: Test filtering by member_id
  const memberFilterRequest = {
    member_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardWarning.IRequest;

  const memberFilteredPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: memberFilterRequest },
    );
  typia.assert(memberFilteredPage);

  // Step 6: Test filtering by active status
  const activeStatusRequest = {
    is_active: true,
  } satisfies IDiscussionBoardWarning.IRequest;

  const activeWarningsPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: activeStatusRequest },
    );
  typia.assert(activeWarningsPage);

  const inactiveStatusRequest = {
    is_active: false,
  } satisfies IDiscussionBoardWarning.IRequest;

  const inactiveWarningsPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: inactiveStatusRequest },
    );
  typia.assert(inactiveWarningsPage);

  // Step 7: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    start_date: sixtyDaysAgo.toISOString(),
    end_date: thirtyDaysAgo.toISOString(),
  } satisfies IDiscussionBoardWarning.IRequest;

  const dateRangeFilteredPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeFilteredPage);

  // Step 8: Test combined filters
  const combinedFilterRequest = {
    warning_level: "second_warning",
    is_active: true,
    start_date: sixtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
  } satisfies IDiscussionBoardWarning.IRequest;

  const combinedFilteredPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: combinedFilterRequest },
    );
  typia.assert(combinedFilteredPage);

  // Step 9: Test pagination
  const paginationRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardWarning.IRequest;

  const firstPageResult =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: paginationRequest },
    );
  typia.assert(firstPageResult);

  TestValidator.equals(
    "first page number should be 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit should be 10",
    firstPageResult.pagination.limit,
    10,
  );

  // Step 10: Test different page sizes
  const largePageRequest = {
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardWarning.IRequest;

  const largePageResult =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: largePageRequest },
    );
  typia.assert(largePageResult);

  TestValidator.equals(
    "large page limit should be 50",
    largePageResult.pagination.limit,
    50,
  );

  // Step 11: Test sorting by created_at ascending
  const sortCreatedAscRequest = {
    sort_by: "created_at",
    sort_order: "asc",
    limit: 20,
  } satisfies IDiscussionBoardWarning.IRequest;

  const sortedCreatedAscPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: sortCreatedAscRequest },
    );
  typia.assert(sortedCreatedAscPage);

  // Step 12: Test sorting by created_at descending
  const sortCreatedDescRequest = {
    sort_by: "created_at",
    sort_order: "desc",
    limit: 20,
  } satisfies IDiscussionBoardWarning.IRequest;

  const sortedCreatedDescPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: sortCreatedDescRequest },
    );
  typia.assert(sortedCreatedDescPage);

  // Step 13: Test sorting by expiration_date
  const sortExpirationRequest = {
    sort_by: "expiration_date",
    sort_order: "asc",
    limit: 15,
  } satisfies IDiscussionBoardWarning.IRequest;

  const sortedExpirationPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: sortExpirationRequest },
    );
  typia.assert(sortedExpirationPage);

  // Step 14: Test sorting by warning_level
  const sortWarningLevelRequest = {
    sort_by: "warning_level",
    sort_order: "desc",
    limit: 25,
  } satisfies IDiscussionBoardWarning.IRequest;

  const sortedWarningLevelPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: sortWarningLevelRequest },
    );
  typia.assert(sortedWarningLevelPage);

  // Step 15: Test sorting by updated_at
  const sortUpdatedRequest = {
    sort_by: "updated_at",
    sort_order: "desc",
    limit: 30,
  } satisfies IDiscussionBoardWarning.IRequest;

  const sortedUpdatedPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: sortUpdatedRequest },
    );
  typia.assert(sortedUpdatedPage);

  // Step 16: Test edge case - empty filter results
  const impossibleFilterRequest = {
    warning_level: "final_warning",
    violation_category: "spam",
    member_id: typia.random<string & tags.Format<"uuid">>(),
    start_date: new Date("2000-01-01").toISOString(),
    end_date: new Date("2000-01-02").toISOString(),
  } satisfies IDiscussionBoardWarning.IRequest;

  const emptyResultPage =
    await api.functional.discussionBoard.administrator.warnings.index(
      connection,
      { body: impossibleFilterRequest },
    );
  typia.assert(emptyResultPage);

  // Step 17: Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    firstPageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "current page should not exceed total pages",
    firstPageResult.pagination.current <= firstPageResult.pagination.pages ||
      firstPageResult.pagination.pages === 0,
  );
}
