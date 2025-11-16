import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search with registration date range filtering.
 *
 * This test validates the date range filtering functionality of the member
 * search API. A moderator authenticates and searches for members registered
 * within a specific date range using created_at_from and created_at_to
 * parameters.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a moderator to gain member list access
 * 2. Define a specific date range for filtering (e.g., last 30 days)
 * 3. Execute member search with created_at_from and created_at_to parameters
 * 4. Validate that all returned members have created_at timestamps within the
 *    range
 * 5. Verify timestamp accuracy and boundary conditions
 * 6. Confirm the date range logic correctly filters members by registration date
 */
export async function test_api_member_search_with_date_range(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(2),
        href: "https://test.example.com/signup" satisfies string &
          tags.Format<"uri">,
        referrer: "https://test.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Define date range for filtering - last 30 days from now
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeStart = thirtyDaysAgo.toISOString();
  const dateRangeEnd = now.toISOString();

  // Step 3: Search for members within the date range
  const searchResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        created_at_from: dateRangeStart,
        created_at_to: dateRangeEnd,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate pagination structure
  typia.assert(searchResult.pagination);
  TestValidator.predicate(
    "pagination should have valid structure",
    searchResult.pagination.current >= 0 &&
      searchResult.pagination.limit > 0 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );

  // Step 5: Validate that all returned members are within the date range
  const dateRangeStartTime = new Date(dateRangeStart).getTime();
  const dateRangeEndTime = new Date(dateRangeEnd).getTime();

  for (const member of searchResult.data) {
    typia.assert(member);

    // Verify member has created_at timestamp
    TestValidator.predicate(
      "member should have created_at field",
      typeof member.created_at === "string",
    );

    // Verify timestamp is within the specified date range
    const memberCreatedAt = new Date(member.created_at).getTime();

    TestValidator.predicate(
      "member registration date should be after or equal to range start",
      memberCreatedAt >= dateRangeStartTime,
    );

    TestValidator.predicate(
      "member registration date should be before or equal to range end",
      memberCreatedAt <= dateRangeEndTime,
    );
  }

  // Step 6: Test with a very narrow date range to verify precision
  const narrowRangeStart = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const narrowRangeEnd = now.toISOString();

  const narrowSearchResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        created_at_from: narrowRangeStart,
        created_at_to: narrowRangeEnd,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(narrowSearchResult);

  // Validate narrow range results
  const narrowRangeStartTime = new Date(narrowRangeStart).getTime();
  const narrowRangeEndTime = new Date(narrowRangeEnd).getTime();

  for (const member of narrowSearchResult.data) {
    const memberCreatedAt = new Date(member.created_at).getTime();

    TestValidator.predicate(
      "narrow range: member should be within date boundaries",
      memberCreatedAt >= narrowRangeStartTime &&
        memberCreatedAt <= narrowRangeEndTime,
    );
  }
}
