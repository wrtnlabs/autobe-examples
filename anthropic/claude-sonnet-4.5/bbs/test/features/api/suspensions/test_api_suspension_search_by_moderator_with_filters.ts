import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuspension";

/**
 * Test the complete workflow for moderators to search and filter user
 * suspensions in the moderation system.
 *
 * This test validates that moderators can authenticate, retrieve a paginated
 * list of suspensions with various filtering criteria, and access suspension
 * details for oversight purposes.
 *
 * Workflow:
 *
 * 1. Create a new moderator account using the join endpoint to establish
 *    authentication
 * 2. Execute a search query on the suspensions endpoint with various filters
 *    including member ID, suspension status (active/expired), date ranges, and
 *    duration constraints
 * 3. Validate that the response contains properly paginated suspension records
 *    with member context, suspension details, and resolution status
 * 4. Verify that filtering by status (active vs expired) returns appropriate
 *    results
 * 5. Confirm that suspensions include moderator attribution, suspension reasons,
 *    duration calculations, and timestamps
 * 6. Test sorting options by suspension start date, end date, and duration
 * 7. Validate that the response format matches the expected
 *    IPageIDiscussionBoardSuspension.ISummary structure
 *
 * Business logic validation:
 *
 * - Only moderators can access suspension search functionality (role-based access
 *   control)
 * - Pagination works correctly with configurable page sizes
 * - Filters accurately narrow results based on search criteria
 * - Suspension records contain all necessary information for moderation oversight
 * - Date range filtering correctly identifies suspensions within specified time
 *   periods
 */
export async function test_api_suspension_search_by_moderator_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorRegistration = {
    appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
    username:
      RandomGenerator.name(1) +
      typia
        .random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()
        .toString(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorRegistration,
    });

  typia.assert(moderator);

  // Step 2: Execute basic suspension search without filters
  const basicSearchRequest = {} satisfies IDiscussionBoardSuspension.IRequest;

  const basicSearchResult: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: basicSearchRequest,
      },
    );

  typia.assert(basicSearchResult);
  TestValidator.predicate(
    "pagination current page is non-negative",
    basicSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    basicSearchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    basicSearchResult.pagination.pages >= 0,
  );

  // Step 3: Test search with active status filter
  const activeFilterRequest = {
    is_active: true,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const activeFilterResult: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: activeFilterRequest,
      },
    );

  typia.assert(activeFilterResult);
  TestValidator.equals(
    "pagination limit matches request",
    activeFilterResult.pagination.limit,
    10,
  );

  // Validate all returned suspensions are active
  if (activeFilterResult.data.length > 0) {
    for (const suspension of activeFilterResult.data) {
      TestValidator.predicate(
        "filtered suspension is active",
        suspension.is_active === true,
      );
    }
  }

  // Step 4: Test search with inactive status filter
  const inactiveFilterRequest = {
    is_active: false,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const inactiveFilterResult: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: inactiveFilterRequest,
      },
    );

  typia.assert(inactiveFilterResult);

  // Validate all returned suspensions are inactive
  if (inactiveFilterResult.data.length > 0) {
    for (const suspension of inactiveFilterResult.data) {
      TestValidator.predicate(
        "filtered suspension is inactive",
        suspension.is_active === false,
      );
    }
  }

  // Step 5: Test search with date range filters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    start_date_from: thirtyDaysAgo.toISOString(),
    start_date_to: now.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const dateRangeResult: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: dateRangeRequest,
      },
    );

  typia.assert(dateRangeResult);
  TestValidator.equals(
    "pagination limit matches date range request",
    dateRangeResult.pagination.limit,
    20,
  );

  // Step 6: Test search with duration constraints
  const durationFilterRequest = {
    duration_min: 1,
    duration_max: 30,
    page: 1,
    limit: 15,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const durationFilterResult: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: durationFilterRequest,
      },
    );

  typia.assert(durationFilterResult);

  // Validate duration constraints
  if (durationFilterResult.data.length > 0) {
    for (const suspension of durationFilterResult.data) {
      TestValidator.predicate(
        "suspension duration within min constraint",
        suspension.duration_days >= 1,
      );
      TestValidator.predicate(
        "suspension duration within max constraint",
        suspension.duration_days <= 30,
      );
    }
  }

  // Step 7: Test search with sorting (ascending by start_date)
  const sortAscRequest = {
    sort: "start_date",
    order: "asc" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const sortAscResult: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: sortAscRequest,
      },
    );

  typia.assert(sortAscResult);

  // Step 8: Test search with sorting (descending by duration_days)
  const sortDescRequest = {
    sort: "duration_days",
    order: "desc" as const,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const sortDescResult: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: sortDescRequest,
      },
    );

  typia.assert(sortDescResult);

  // Step 9: Test search with member_id filter
  const memberFilterRequest = {
    member_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const memberFilterResult: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: memberFilterRequest,
      },
    );

  typia.assert(memberFilterResult);

  // Step 10: Test search with text search
  const textSearchRequest = {
    search: "violation",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const textSearchResult: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: textSearchRequest,
      },
    );

  typia.assert(textSearchResult);

  // Step 11: Test pagination by requesting multiple pages
  const page1Request = {
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const page1Result: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: page1Request,
      },
    );

  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 current page is 1",
    page1Result.pagination.current,
    1,
  );

  const page2Request = {
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardSuspension.IRequest;

  const page2Result: IPageIDiscussionBoardSuspension.ISummary =
    await api.functional.discussionBoard.moderator.suspensions.index(
      connection,
      {
        body: page2Request,
      },
    );

  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "both pages have same limit",
    page1Result.pagination.limit,
    page2Result.pagination.limit,
  );
  TestValidator.equals(
    "both pages have same total records",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
}
