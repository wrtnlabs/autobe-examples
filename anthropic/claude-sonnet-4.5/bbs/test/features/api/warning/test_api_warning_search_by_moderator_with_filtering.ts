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
 * Test moderator's ability to search and filter member warnings.
 *
 * This test validates that moderators can effectively search and retrieve
 * warnings with various filtering criteria including warning level, violation
 * category, member ID, date ranges, and active status. It also tests pagination
 * and sorting functionality to ensure moderators can efficiently review warning
 * history and identify patterns in community guideline violations.
 *
 * Steps:
 *
 * 1. Create and authenticate moderator account
 * 2. Search warnings with various filter combinations
 * 3. Test pagination with different page sizes
 * 4. Validate sorting options (created_at, expiration_date, warning_level)
 * 5. Verify response structure and data accuracy
 */
export async function test_api_warning_search_by_moderator_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Search all warnings without filters (baseline)
  const allWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(allWarnings);

  TestValidator.predicate(
    "pagination metadata should be valid",
    allWarnings.pagination.current === 1 &&
      allWarnings.pagination.limit === 20 &&
      allWarnings.pagination.records >= 0,
  );

  // Step 3: Filter by warning_level - test first_warning level
  const firstWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        warning_level: "first_warning",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(firstWarnings);

  // Step 4: Filter by warning_level - test second_warning level
  const secondWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        warning_level: "second_warning",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(secondWarnings);

  // Step 5: Filter by warning_level - test final_warning level
  const finalWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        warning_level: "final_warning",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(finalWarnings);

  // Step 6: Filter by violation_category - test hate_speech
  const hateSpeechWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        violation_category: "hate_speech",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(hateSpeechWarnings);

  // Step 7: Filter by violation_category - test spam
  const spamWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        violation_category: "spam",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(spamWarnings);

  // Step 8: Filter by active status - active warnings only
  const activeWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        is_active: true,
        page: 1,
        limit: 15,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(activeWarnings);

  // Step 9: Filter by active status - inactive warnings only
  const inactiveWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        is_active: false,
        page: 1,
        limit: 15,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(inactiveWarnings);

  // Step 10: Filter by date range - recent warnings (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(recentWarnings);

  // Step 11: Combined filters - active final warnings for hate_speech
  const criticalWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        warning_level: "final_warning",
        violation_category: "hate_speech",
        is_active: true,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(criticalWarnings);

  // Step 12: Test sorting by created_at descending (most recent first)
  const sortedByDateDesc: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(sortedByDateDesc);

  // Step 13: Test sorting by created_at ascending (oldest first)
  const sortedByDateAsc: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(sortedByDateAsc);

  // Step 14: Test sorting by expiration_date
  const sortedByExpiration: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        sort_by: "expiration_date",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(sortedByExpiration);

  // Step 15: Test sorting by warning_level
  const sortedByLevel: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        sort_by: "warning_level",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(sortedByLevel);

  // Step 16: Test pagination - page 1
  const page1: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(page1);

  TestValidator.predicate(
    "page 1 should have correct pagination values",
    page1.pagination.current === 1 && page1.pagination.limit === 5,
  );

  // Step 17: Test pagination - page 2 (if available)
  if (page1.pagination.pages >= 2) {
    const page2: IPageIDiscussionBoardWarning =
      await api.functional.discussionBoard.moderator.warnings.index(
        connection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IDiscussionBoardWarning.IRequest,
        },
      );
    typia.assert(page2);

    TestValidator.predicate(
      "page 2 should have correct pagination values",
      page2.pagination.current === 2 && page2.pagination.limit === 5,
    );
  }

  // Step 18: Test maximum limit
  const maxLimitWarnings: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.moderator.warnings.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardWarning.IRequest,
    });
  typia.assert(maxLimitWarnings);

  TestValidator.predicate(
    "limit should not exceed 100",
    maxLimitWarnings.pagination.limit <= 100,
  );

  // Step 19: Verify response structure contains all required warning fields
  if (allWarnings.data.length > 0) {
    const sampleWarning = allWarnings.data[0];
    typia.assert(sampleWarning);

    TestValidator.predicate(
      "warning should have all required fields",
      typeof sampleWarning.id === "string" &&
        typeof sampleWarning.member_id === "string" &&
        typeof sampleWarning.moderation_action_id === "string" &&
        typeof sampleWarning.warning_level === "string" &&
        typeof sampleWarning.violation_category === "string" &&
        typeof sampleWarning.moderator_notes === "string" &&
        typeof sampleWarning.is_active === "boolean" &&
        typeof sampleWarning.created_at === "string" &&
        typeof sampleWarning.updated_at === "string",
    );
  }
}
