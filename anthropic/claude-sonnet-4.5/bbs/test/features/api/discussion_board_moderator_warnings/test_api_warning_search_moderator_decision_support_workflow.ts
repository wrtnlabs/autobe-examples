import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWarning";

/**
 * Test the warning search endpoint as part of a moderator's decision-making
 * workflow for escalating enforcement actions.
 *
 * This test validates that the warning search endpoint provides moderators with
 * comprehensive filtering, sorting, and pagination capabilities needed to
 * review member violation history and make informed enforcement decisions
 * within the graduated warning system (first_warning → second_warning →
 * final_warning).
 *
 * Since the API SDK does not provide endpoints for creating warnings or members
 * (only search functionality exists), this test focuses on validating the
 * search endpoint's parameter handling, response structure, and type safety.
 *
 * Test Flow:
 *
 * 1. Moderator authenticates to obtain access tokens
 * 2. Test warning search with various filter combinations (warning_level,
 *    violation_category, is_active)
 * 3. Validate pagination parameters (page, limit)
 * 4. Test sorting options (sort_by, sort_order) for chronological violation review
 * 5. Validate response structure and type safety of returned warning data
 */
export async function test_api_warning_search_moderator_decision_support_workflow(
  connection: api.IConnection,
) {
  const moderatorData = {
    appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  const searchAllWarnings = {
    page: 1,
    limit: 25,
  } satisfies IDiscussionBoardWarning.IRequest;

  const allWarningsPage =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: searchAllWarnings,
    });
  typia.assert(allWarningsPage);

  TestValidator.equals(
    "pagination current page matches request",
    allWarningsPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    allWarningsPage.pagination.limit,
    25,
  );

  const searchByWarningLevel = {
    warning_level: "first_warning" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardWarning.IRequest;

  const firstWarningsPage =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: searchByWarningLevel,
    });
  typia.assert(firstWarningsPage);

  const searchByViolationCategory = {
    violation_category: "personal_attack" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardWarning.IRequest;

  const personalAttackWarnings =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: searchByViolationCategory,
    });
  typia.assert(personalAttackWarnings);

  const searchActiveWarnings = {
    is_active: true,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardWarning.IRequest;

  const activeWarningsPage =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: searchActiveWarnings,
    });
  typia.assert(activeWarningsPage);

  const searchWithSorting = {
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
    page: 1,
    limit: 15,
  } satisfies IDiscussionBoardWarning.IRequest;

  const sortedWarningsPage =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: searchWithSorting,
    });
  typia.assert(sortedWarningsPage);

  const searchByMemberId = {
    member_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardWarning.IRequest;

  const memberWarningsPage =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: searchByMemberId,
    });
  typia.assert(memberWarningsPage);

  const dateRangeSearch = {
    start_date: new Date("2024-01-01").toISOString(),
    end_date: new Date().toISOString(),
    page: 1,
    limit: 30,
  } satisfies IDiscussionBoardWarning.IRequest;

  const dateRangeWarnings =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: dateRangeSearch,
    });
  typia.assert(dateRangeWarnings);

  const complexSearch = {
    warning_level: "second_warning" as const,
    violation_category: "offensive_language" as const,
    is_active: true,
    sort_by: "created_at" as const,
    sort_order: "asc" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardWarning.IRequest;

  const complexSearchResults =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: complexSearch,
    });
  typia.assert(complexSearchResults);
}
